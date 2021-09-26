import ts, { factory } from 'typescript'

export type ObjectProperties = {[key: string]: TypeDefinition}

export type Description = {
  description?: string
}

export type EnumOption = string | number // should really be any literal

// Enums
export type Enum = {
  enum?: EnumOption[]
}

export type Format = {
  format: string
}

export type ReferenceDefinition = {
  $ref: string
}

export type ObjectDefinition = {
  type: 'object'
  properties: ObjectProperties
  required?: string[]
  additionalProperties?: boolean | TypeDefinition
} & Description & Enum

export type StringDefinition = {
  type: 'string'
  format?: string
} & Description & Enum

export type NumberDefinition = {
  type: 'number' | 'integer'
  format?: string
} & Description & Enum

export type BooleanDefinition = {
  type: 'boolean',
} & Description & Enum

export type ArrayDefinition = {
  type: 'array',
  items: TypeDefinition
} & Description & Enum

export type UnionDefinition = {
  oneOf: TypeDefinition[]
} & Description

export type Enumerated<T extends SimpleDefinition> = Omit<T, "enum"> & Required<Enum>
export type NonEnumerated<T extends SimpleDefinition> = Omit<T, "enum">

export type FormattedStringDefinition = Omit<StringDefinition, "format"> & Required<Format>
export type NonFormattedStringDefinition = Omit<StringDefinition, "format">

export type AnyStringDefinition = FormattedStringDefinition | NonFormattedStringDefinition

export type PrimitiveDefinition = AnyStringDefinition | NumberDefinition | BooleanDefinition

export type ComplexDefinition = ObjectDefinition | ArrayDefinition

export type SimpleDefinition = PrimitiveDefinition | ComplexDefinition


export type EnumeratedSimpleDefinition = Enumerated<SimpleDefinition>

export type NonEnumeratedSimpleDefinition = NonEnumerated<SimpleDefinition>

export type AnySimpleDefinition = EnumeratedSimpleDefinition | NonEnumeratedSimpleDefinition

export type AliasDefinition = UnionDefinition | ReferenceDefinition

export type TypeDefinition = AnySimpleDefinition | AliasDefinition

export default class BaseType {
  constructor(definition: any) {
    Object.assign(this, definition)
  }

  static toSpecificType(definition: TypeDefinition) {
    if('type' in definition) {
      return SimpleType.toSpecificType(definition as SimpleDefinition)
    } else if('$ref' in definition) {
      return new TypeReference(definition as ReferenceDefinition)
    } else if('oneOf' in definition) {
      return UnionType.toSpecificType(definition as UnionDefinition)
    }
  }

  toAST(options?: {}): ts.Node | ts.Node[] {
    return null as any
  }
}

class SimpleType extends BaseType {
  static toSpecificType(definition: SimpleDefinition) {
    if('enum' in definition) {
      return EnumeratedSimpleType.toSpecificType(definition as EnumeratedSimpleDefinition)
    } else {
      return NonEnumeratedSimpleType.toSpecificType(definition as NonEnumeratedSimpleDefinition)
    }
  }
}

export class EnumeratedSimpleType extends BaseType {
  static toSpecificType(definition: EnumeratedSimpleDefinition): UnionType | Constant {
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
  static toSpecificType(definition: NonEnumeratedSimpleDefinition): SimpleType {
    switch(definition.type) {
      case 'number':
      case 'integer':
        return new NumberType(definition as NumberDefinition)

      case 'string':
        return AnyStringType.toSpecificType(definition as AnyStringDefinition)

      case 'boolean':
        return new BooleanType(definition as BooleanDefinition)

       case 'object':
        return new ObjectType(definition as ObjectDefinition)

      case 'array':
        return new ArrayType(definition as ArrayDefinition)
    }
  }
}





export class PrimitiveType extends BaseType {
  static toSpecificType(definition: PrimitiveDefinition) {
    switch(definition.type) {
      case 'number':
      case 'integer':
        return new NumberType(definition as NumberDefinition)
      case 'string':
        return AnyStringType.toSpecificType(definition as AnyStringDefinition)
      case 'boolean':
        return new BooleanType(definition as BooleanDefinition)
    }
  }
}

export class AnyStringType extends PrimitiveType {
  static toSpecificType(definition: AnyStringDefinition) {
    if('format' in definition) {
      return FormattedStringType.toSpecificType(definition as FormattedStringDefinition)
    } else {
      return new StringType(definition as NonFormattedStringDefinition)
    }
  }
}

export class StringType extends AnyStringType {
  format: string

  toAST(options?: {}) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  }
}

export class FormattedStringType extends AnyStringType {
  static formats: {
    [key: string]: typeof FormattedStringType
  } = {}

  static addFormat(key: string, format: typeof FormattedStringType) {
    this.formats[key] = format
  }

  static toSpecificType(definition: FormattedStringDefinition) {
    if(definition.format in this.formats) {
      return new this.formats[definition.format](definition)
    } else {
      return new StringType(definition)
    }
  }
}

export class DateFormattedStringType extends FormattedStringType {
  toAST(options: ToASTOptions) {
    return null as any
  }
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

export class ComplexType extends BaseType {
}

export class ArrayType extends ComplexType {
  type: BaseType

  constructor(definition: ArrayDefinition) {
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

  constructor(definition: ObjectDefinition) {
    super({})

    if(!('required' in definition)) {
      definition['required'] = []
    }

    this.properties = Object.entries(definition.properties).map( p => {
      const name = p[0]
      const def = p[1]
      return new ObjectProperty(name, BaseType.toSpecificType(def), definition.required.includes(name))
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

  constructor(definition: ReferenceDefinition) {
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
  constructor(definition: {options: any}) {
    super({})
    this.options = definition.options
  }

  static toSpecificType(definition: UnionDefinition) {
    if(definition.oneOf.length == 0) {
      throw new Error("Unions must have atleast one option")
    } else if (definition.oneOf.length == 1){
      return new Constant(definition.oneOf[0])
    } else {
      return new UnionType({
        options: definition.oneOf.map( o => BaseType.toSpecificType(o) )
      })
    }
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
