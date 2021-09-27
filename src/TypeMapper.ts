import * as Types from './Types'
import * as InputTypes from './InputTypes'

export default class TypeMapper {
  static addStringFormat(key: string, format: typeof Types.FormattedStringType) {
    Types.FormattedStringType.addFormat(key, format)
  }

  static toSpecificType(definition: InputTypes.TypeDefinition) {
    if('type' in definition) {
      return this.toSimpleType(definition as InputTypes.SimpleDefinition)
    } else if('$ref' in definition) {
      return Types.TypeReference.toSpecificType(definition as InputTypes.ReferenceDefinition)
    } else if('oneOf' in definition) {
      return this.toUnionType(definition as InputTypes.UnionDefinition)
    } else {
      throw new Error("Unknown type definition")
    }
  }

  static toSimpleType(definition: InputTypes.SimpleDefinition) {
    if('enum' in definition) {
      return this.toEnumeratedSimpleType(definition as InputTypes.EnumeratedSimpleDefinition)
    } else {
      return this.toNonEnumeratedSimpleType(definition as InputTypes.NonEnumeratedSimpleDefinition)
    }
  }

  static toNonEnumeratedSimpleType(definition: InputTypes.NonEnumeratedSimpleDefinition): Types.SimpleType {
    switch(definition.type) {
      case 'number':
      case 'integer':
        return Types.NumberType.toSpecificType(definition as InputTypes.NumberDefinition)

      case 'string':
        return this.toAnyStringType(definition as InputTypes.AnyStringDefinition)

      case 'boolean':
        return Types.BooleanType.toSpecificType(definition as InputTypes.BooleanDefinition)

       case 'object':
        return Types.ObjectType.toSpecificType(definition as InputTypes.ObjectDefinition)

      case 'array':
        return Types.ArrayType.toSpecificType(definition as InputTypes.ArrayDefinition)
    }
  }

  static toEnumeratedSimpleType(definition: InputTypes.EnumeratedSimpleDefinition): Types.UnionType | Types.Constant {
    if(definition.enum.length == 0) {
      throw new Error("Enums must have at least one option")
    } else if( definition.enum.length == 1 ) {
      return Types.Constant.toSpecificType(definition.enum[0])
    } else {
      return new Types.UnionType({options: definition.enum.map( v => new Types.Constant(v))})
    }
  }

  static toUnionType(definition: InputTypes.UnionDefinition) {
    if(definition.oneOf.length == 0) {
      throw new Error("Unions must have atleast one option")
    } else if (definition.oneOf.length == 1){
      return this.toSpecificType(definition.oneOf[0])
    } else {
      return new Types.UnionType({
        options: definition.oneOf.map( o => this.toSpecificType(o) )
      })
    }
  }

  static toAnyStringType(definition: InputTypes.AnyStringDefinition) {
    if('format' in definition) {
      return this.toFormattedStringType(definition as InputTypes.FormattedStringDefinition)
    } else {
      return new Types.StringType(definition as InputTypes.NonFormattedStringDefinition)
    }
  }

  static toFormattedStringType(definition: InputTypes.FormattedStringDefinition) {
    return Types.FormattedStringType.toSpecificType(definition)
  }
}