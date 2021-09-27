export class TypeMatcher {
  rules: any[]

  addRule(rule: (definition: any) => {}, name: string, positive: boolean) {
    this.rules.push({
      rule,
      name,
      positive
    })
  }
}

export class TypeMatcherBuilder {
  matcher: TypeMatcher

  constructor() {
    this.matcher = new TypeMatcher()
  }

  hasProperty(name: string, positiveMatch = true) {
    this.matcher.addRule(
      (d: any) => name in d,
      `has-property-${name}`,
      positiveMatch
    )
  }

  propertyEquals(name: string, value: any, positiveMatch = true) {
    this.matcher.addRule(
      (d: any) => name in d && d[name] == value,
      `property-${name}-equals-${value}`,
      positiveMatch
    )
  }

  propertyIsArray(name: string, positiveMatch = true) {
    this.matcher.addRule(
      (d: any) => name in d && d[name].constructor?.name == 'Array',
      `property-${name}-is-array`,
      positiveMatch
    )
  }

  arrayLengthGreaterThan(name: string, length: number, positiveMatch = true) {
    this.matcher.addRule(
      (d: any) => name in d && d[name].constructor?.name == 'Array' && d[name].length > length,
      `property-${name}-is-array`,
      positiveMatch
    )
  }

}


/*
export default class TypeMatcher {
  definition: any
  state: {rule: string, result: boolean}[]

  has(property: string) {
    return this.check((d) => {
        return property in d
      }, `has-${property}`
    )
  }

  doesnt_have(property: string) {
    return this.check((d) => {
        return !(property in d)
      }, `has-${property}`
    )
  }

  property_is(property: string,value: any) {
    return this.check((d) => {
        return (property in d) && d[property] == value
      }, `property-${property}-equals-${value}`
    )

  }

  property_is_not(property: string, value: any) {
    return this.check((d) => {
        return !(property in d) || d[property] != value
      }, `property-${property}-not-equals-${value}`
    )

  }

  check(fn: function, id: string) {
    state.push({
      rule: id,
      result: fn(this.definition)
    })
  }
}

class StringMatcher extends TypeMatcher {
  match(definition) {
    this.has('type').property_is('type', 'string')
  }
}
*/
