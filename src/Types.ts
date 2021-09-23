import ts, { factory } from 'typescript'

export default class BaseType {
  constructor(definition: any) {
    Object.assign(this, definition)
  }

  static toSpecificType(definition: any) {
    if('type' in definition) {
      if(!('enum' in definition)) {
        switch(definition.type) {
          case 'string':
            return new StringType(definition)

          case 'number':
            return new NumberType(definition)

          case 'boolean':
            return new BooleanType(definition)

          case 'object':
            return new ObjectType(definition)

          case 'array':
            return new ArrayType(definition)
        }
      } else {
        if('type' in definition) {
          switch(definition.type) {
            case 'string':
              if(definition.enum.length > 1) {
                return new UnionType({
                  options: definition.enum.map((v: any) => new Constant(v as string))
                })
              } else {
                return new Constant(definition.enum[0] as string)
              }
          }
        }
      }
    } else if('$ref' in definition) {
      return new TypeReference(definition)
    } else if('oneOf' in definition) {
      return new UnionType({
        options: definition.oneOf.map((t: any) => BaseType.toSpecificType(t))
      })
    }
  }

  toAST(options?: {}): ts.Node | ts.Node[] {
    return null as any
  }
}

export class PrimitiveType extends BaseType {

}

export class NumberType extends PrimitiveType {
  format: string

  toAST(options?: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
  }
}

export class BooleanType extends PrimitiveType {
  toAST(options: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
  }
}

export class StringType extends PrimitiveType {
  format: string

  toAST(options?: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  }
}

export class ComplexType extends BaseType {
}

export class ArrayType extends ComplexType {
  type: BaseType

  constructor(definition: any) {
    super({})
    this.type = BaseType.toSpecificType(definition.items)
  }

  toAST(options?: {}) {
    return factory.createArrayTypeNode(this.type.toAST(options) as ts.TypeNode)
  }
}

type ToASTOptions = {
  importMappings?: {[key: string]: string[]}
}

export class ObjectProperty {
  name: string
  type: BaseType
  required: boolean

  constructor(name: string, type: BaseType, required: boolean) {
    this.name = name
    this.type = type
    this.required = required
  }

  toAST(options?: ToASTOptions) {
    let identifier
    if(
      this.name.includes('-') ||
      this.name.includes('&')
    ) {
      identifier = factory.createStringLiteral(this.name)
    } else {
      identifier = factory.createIdentifier(this.name)
    }


    return factory.createPropertySignature(
      undefined,
      identifier,
      !this.required ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      this.type.toAST(options) as ts.TypeNode
    )
  }

  toObjectPropertyAssignment(value) {

  }
}

export class ObjectType extends ComplexType  {
  properties: ObjectProperty[]

  constructor(definition: any) {
    super({})

    if(!('required' in definition)) {
      definition['required'] = []
    }

    this.properties = Object.entries(definition.properties).map( p => {
      return new ObjectProperty(p[0], BaseType.toSpecificType(p[1]), definition.required.includes(p[0]))
    })
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}): ts.TypeLiteralNode {
    return factory.createTypeLiteralNode(
      this.properties.map( p => p.toAST(options) )
    )
  }

  toPartialObjectDefinition(values: {[key: string]: any}, rest?: string) {
    return factory.createObjectLiteralExpression(
      [
        factory.createPropertyAssignment(
          factory.createIdentifier("key1"),
          factory.createStringLiteral("asdasd")
        ),
        factory.createPropertyAssignment(
          factory.createIdentifier("key2"),
          factory.createNumericLiteral("123")
        )
      ],
      true
    )
  }
}

export class TypeReference extends BaseType {
  reference: string

  constructor(definition) {
    super({})
    this.reference = definition['$ref']
  }

  jsonRefToName(options?: {importMappings?: {[key: string]: string[]}}) {
    const fqn = this.reference.split("/")

    if(options?.importMappings) {
      return factory.createQualifiedName(
        factory.createIdentifier(options.importMappings[fqn[1]][1]),
        factory.createIdentifier(fqn[fqn.length - 1])
      )
    } else {
      return factory.createIdentifier(fqn.pop())
    }
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}) {
    return factory.createTypeReferenceNode(
      this.jsonRefToName(options),
      undefined
    )
  }
}

export class Constant extends BaseType {
  value: any
  type: string
  constructor(value: any) {
    super({})
    this.type = typeof(value)
    this.value = value
  }

  toAST(options?: {}): ts.LiteralTypeNode {
    switch(this.type) {
      case 'number':
        return factory.createLiteralTypeNode(factory.createNumericLiteral(this.value))

      case 'string':
      default:
        return factory.createLiteralTypeNode(factory.createStringLiteral(this.value))
    }
  }
}

export class UnionType extends BaseType {
  options: any[]
  constructor(definition) {
    super({})
    this.options = definition.options
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}) {
    return factory.createUnionTypeNode(this.options.map( o => o.toAST(options) ))
  }
}

export class NamedType {
  type: BaseType
  name: string | string[]
  description?: string

  constructor(name: string | string[], type: BaseType, description?: string) {
    this.type = type
    this.name = name
    this.description = description
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}) {
    const nodes = []

    if(this.description) {
      nodes.push(factory.createJSDocComment(this.description))
    }

    nodes.push(factory.createTypeAliasDeclaration(
      undefined,
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createIdentifier(this.name as string),
      undefined,
      this.type.toAST(options) as ts.TypeNode
    ))

    return nodes
  }
}
