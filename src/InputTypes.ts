export type ObjectProperties = {[key: string]: TypeDefinition}

export type Describable = {
  description?: string
}

export type EnumOption = string | number // should really be any literal

export type Enumerable = {
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
} & Describable & Enumerable

export type StringDefinition = {
  type: 'string'
  format?: string
} & Describable & Enumerable

export type NumberDefinition = {
  type: 'number' | 'integer'
  format?: string
} & Describable & Enumerable

export type BooleanDefinition = {
  type: 'boolean',
} & Describable & Enumerable

export type ArrayDefinition = {
  type: 'array',
  items: TypeDefinition
} & Describable & Enumerable

export type UnionDefinition = {
  oneOf: TypeDefinition[]
} & Describable

export type Enumerated<T extends SimpleDefinition> = Omit<T, "enum"> & Required<Enumerable>

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

export type EventDefinition = {
  key: string
  name?: string
  type: "screen" | "track"
  features?: string[]
  description?: string
  additionalProperties?: boolean
  loginRequired?: boolean
  required?: string[]
  properties?: { [key: string]: TypeDefinition }
}

export type ScreenDefinition = Omit<EventDefinition, "type">
export type TrackDefinition = Omit<EventDefinition, "type">
