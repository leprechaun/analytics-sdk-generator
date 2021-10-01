import ts, { factory } from 'typescript'

import TypeMapper from './TypeMapper'
import * as InputTypes from './InputTypes'

export interface PrintableDataType {
  toAST(options?: ToASTOptions): ts.Node | ts.Node[]
}

export class BaseType {
  constructor(definition: any) {
    Object.assign(this, definition)
  }

  toAST(options?: {}): ts.Node | ts.Node[] {
    return null as any
  }

  toPartialLiteralAST(value: any): any {
    return factory.createStringLiteral("hardcodedlol")
  }
}

export class SimpleType extends BaseType {
  static toSpecificType(definition: InputTypes.SimpleDefinition) {
    if('enum' in definition) {
      return EnumeratedSimpleType.toSpecificType(definition as InputTypes.EnumeratedSimpleDefinition)
    } else {
      return NonEnumeratedSimpleType.toSpecificType(definition as InputTypes.NonEnumeratedSimpleDefinition)
    }
  }
}

export class EnumeratedSimpleType extends BaseType {
  static toSpecificType(definition: InputTypes.EnumeratedSimpleDefinition): UnionType | Constant {
    if(definition.enum.length == 0) {
      throw new Error("Enums must have at least one option")
    } else if( definition.enum.length == 1 ) {
      return new Constant(definition.enum[0])
    } else {
      return new UnionType({options: definition.enum.map( v => new Constant(v))})
    }
  }
}

export class NonEnumeratedSimpleType extends BaseType {
  static toSpecificType(definition: InputTypes.NonEnumeratedSimpleDefinition): SimpleType {
    switch(definition.type) {
      case 'number':
      case 'integer':
        return new NumberType(definition as InputTypes.NumberDefinition)

      case 'string':
        return AnyStringType.toSpecificType(definition as InputTypes.AnyStringDefinition)

      case 'boolean':
        return new BooleanType(definition as InputTypes.BooleanDefinition)

       case 'object':
        return new ObjectType(definition as InputTypes.ObjectDefinition)

      case 'array':
        return new ArrayType(definition as InputTypes.ArrayDefinition)
    }
  }
}

export class PrimitiveType extends BaseType {
  static toSpecificType(definition: InputTypes.PrimitiveDefinition) {
    switch(definition.type) {
      case 'number':
      case 'integer':
        return new NumberType(definition as InputTypes.NumberDefinition)
      case 'string':
        return AnyStringType.toSpecificType(definition as InputTypes.AnyStringDefinition)
      case 'boolean':
        return new BooleanType(definition as InputTypes.BooleanDefinition)
    }
  }
}

export class AnyStringType extends PrimitiveType {
  static toSpecificType(definition: InputTypes.AnyStringDefinition) {
    if('format' in definition) {
      return FormattedStringType.toSpecificType(definition as InputTypes.FormattedStringDefinition)
    } else {
      return new StringType(definition as InputTypes.NonFormattedStringDefinition)
    }
  }
}

export class StringType extends AnyStringType {
  format: string

  toAST(options?: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  }

  toPartialLiteralAST(value: any) {
    return factory.createStringLiteral(value)
  }
}

export class FormattedStringType extends AnyStringType {
  static formats: {
    [key: string]: typeof FormattedStringType
  } = {}

  static addFormat(key: string, format: typeof FormattedStringType) {
    this.formats[key] = format
  }

  static toSpecificType(definition: InputTypes.FormattedStringDefinition) {
    if(definition.format in this.formats) {
      return new this.formats[definition.format](definition)
    } else {
      return new StringType(definition)
    }
  }
}

export class DateFormattedStringType extends FormattedStringType {
  toAST(options: ToASTOptions) {
    return factory.createTypeReferenceNode(
      factory.createIdentifier("Date"),
      undefined
    )
  }
}

FormattedStringType.addFormat('date-time', DateFormattedStringType)

export class NumberType extends PrimitiveType {
  format: string

  toAST(options?: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
  }

  toPartialLiteralAST(value: any) {
    return factory.createNumericLiteral(value)
  }

  static toSpecificType(definition: InputTypes.NumberDefinition) {
    return new this(definition)
  }
}

export class BooleanType extends PrimitiveType {
  toAST(options: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword)
  }

  static toSpecificType(definition: InputTypes.BooleanDefinition) {
    return new this(definition)
  }

  toPartialLiteralAST(value: any) {
    return !!value ? factory.createTrue() : factory.createFalse()
  }
}

export class ComplexType extends BaseType {
}

export class ArrayType extends ComplexType {
  type: BaseType

  constructor(definition: InputTypes.ArrayDefinition) {
    super({})
    this.type = TypeMapper.toSpecificType(definition.items)
  }

  toAST(options?: {}) {
    return factory.createArrayTypeNode(this.type.toAST(options) as ts.TypeNode)
  }

  static toSpecificType(definition: InputTypes.ArrayDefinition) {
    return new this(definition)
  }

  toPartialLiteralAST(value: any) {
    factory.createArrayLiteralExpression(
      [
        factory.createTrue(),
        factory.createFalse()
      ],
      false
    )
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

  toPartialLiteralAST() {
    if(this.type instanceof Constant) {
      return factory.createPropertyAssignment(
        factory.createIdentifier(this.name),
        (this.type as Constant).toPartialLiteralAST()
      )
    }
    else if(this.type instanceof ObjectType) {
      return factory.createPropertyAssignment(
        factory.createIdentifier(this.name),
        (this.type as ObjectType).toPartialLiteralAST()
      )
    } else {
      throw new Error("WUT")
    }
  }

  toAST(options?: ToASTOptions) {
    let identifier
    if(
      this.name.includes('-') ||
      this.name.includes('&') ||
      this.name.includes(' ')
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
}

export class ObjectType extends ComplexType  {
  properties: ObjectProperty[]

  constructor(definition: InputTypes.ObjectDefinition) {
    super({})

    if(!('required' in definition)) {
      definition['required'] = []
    }

    this.properties = Object.entries(definition.properties).map( p => {
      const name = p[0]
      const def = p[1]
      return new ObjectProperty(name, TypeMapper.toSpecificType(def), definition.required.includes(name))
    })
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}): ts.TypeLiteralNode {
    return factory.createTypeLiteralNode(
      this.properties.map( p => p.toAST(options) )
    )
  }

  static toSpecificType(definition: InputTypes.ObjectDefinition) {
    return new this(definition)
  }


  toPartialLiteralAST(overwrites?: string, defaults?: string, options?: {importMappings?: {[key: string]: string[]}}) {
    const filter = (p: ObjectProperty) => {
      return p.type instanceof Constant || p.type instanceof ObjectType
    }

    let props = this.properties.filter(filter).map( p => p.toPartialLiteralAST() )

    if(typeof(overwrites) == 'string') {
      props.push(
        factory.createSpreadAssignment(factory.createIdentifier(overwrites))
      )
    }
    if(typeof(defaults) == 'string') {
      props = [factory.createSpreadAssignment(factory.createIdentifier(defaults))].concat(props)
    }

    return factory.createObjectLiteralExpression(
      props,
      true
    )
  }
}

export class TypeReference extends BaseType {
  reference: string

  constructor(definition: InputTypes.ReferenceDefinition) {
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

  static toSpecificType(definition: InputTypes.ReferenceDefinition) {
    return new this(definition)
  }
}

export class Constant extends BaseType {
  value: any
  type: BaseType

  constructor(value: any) {
    super({})
    this.value = value
  }

  static toSpecificType(definition: any) {
    return new this(definition)
  }

  setType(type: BaseType) {
    this.type = type
    return this
  }

  toPartialLiteralAST() {
    return (this.type).toPartialLiteralAST(this.value)
  }

  toAST(options?: {}): ts.LiteralTypeNode {
    return factory.createLiteralTypeNode(
      (this.type as StringType).toPartialLiteralAST(this.value)
    )

    /*
    switch(this.type) {
      case 'number':
        return factory.createLiteralTypeNode(factory.createNumericLiteral(this.value))

      case 'string':
      default:
        return factory.createLiteralTypeNode(factory.createStringLiteral(this.value))
    }
    */
  }
}

export class UnionType extends BaseType {
  options: any[]
  constructor(definition: {options: any}) {
    super({})
    this.options = definition.options
  }

  static toSpecificType(definition: InputTypes.UnionDefinition) {
    if(definition.oneOf.length == 0) {
      throw new Error("Unions must have atleast one option")
    } else if (definition.oneOf.length == 1){
      return TypeMapper.toSpecificType(definition.oneOf[0])
    } else {
      return new UnionType({
        options: definition.oneOf.map( o => TypeMapper.toSpecificType(o) )
      })
    }
  }

  toAST(options?: {importMappings?: {[key: string]: string[]}}) {
    return factory.createUnionTypeNode(this.options.map( o => o.toAST(options) ))
  }
}

export class NamedType {
  type: BaseType
  name: string
  description?: string

  constructor(name: string, type: BaseType, description?: string) {
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

  toPartialLiteralAST() {
    const nodes = []

    if(this.description) {
      nodes.push(factory.createJSDocComment(this.description))
    }



    nodes.push(factory.createVariableStatement(
      undefined,
      factory.createVariableDeclarationList(
        [factory.createVariableDeclaration(
          factory.createIdentifier(this.name as string),
          undefined,
          undefined,
          (this.type as Constant).toPartialLiteralAST()
        )],
        ts.NodeFlags.Const
      )
    ))

    return nodes
  }
}
