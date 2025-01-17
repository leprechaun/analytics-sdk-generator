import TypeMapper from './TypeMapper'
import * as InputTypes from './InputTypes'
import { EventDefinition, TrackDefinition, ScreenDefinition, ObjectDefinition } from './InputTypes'
import { ObjectType } from './Types'

export class Feature {
  name: string
  screens: Screen[]
  tracks: Track[]

  constructor(name: string) {
    this.name = name
    this.screens = []
    this.tracks = []
  }

  addScreen(screen: Screen) {
    this.screens.push(screen)
  }

  addTrack(track: Track) {
    this.tracks.push(track)
  }
}

export type EventType  = "screen" | "track"

export class Event {
  type: EventType
  key: string
  name: string
  description?: string
  additionalProperties: boolean
  loginRequired?: boolean
  properties: ObjectType
  features: Feature[]
  tracks: Track[]
  screens: Screen[]


  constructor(definition: EventDefinition) {
    this.features = []
    this.tracks = []
    this.screens = []

    if(!('key' in definition)) {
      throw new Error("'key' is required")
    }

    if(!('type' in definition)) {
      throw new Error("'type' is required")
    }

    this.additionalProperties = definition.additionalProperties || false
    this.loginRequired = definition.loginRequired
    this.type = definition.type
    this.key = definition.key
    this.name = definition.name || definition.key

    this.properties = this.parseProperties(definition)

    if('description' in definition) {
      this.description = definition.description
    }
  }

  parseProperties(definition: EventDefinition) {
    const propertiesObjectDefinition = {
      type: "object",
      properties: definition.properties == undefined ? {} : definition.properties,
      required: definition.required || [],
      additionalProperties: definition.additionalProperties || false
    } as ObjectDefinition


    return TypeMapper.toSpecificType(
      propertiesObjectDefinition as ObjectDefinition
    ) as ObjectType

  }

  escapeKey() {
    return this.key.replace(/[ &]/g, match => match === ' ' ? '' : 'n');
  }

  uniqueFeaturesAndScreens() {
    const featureNames = new Set([
      ...(this.screens || []).flatMap(screen => screen.features.map(f => f.name)),
      ...(this.features || []).map(f => f.name)
    ]);

    const screenNames = new Set(
      (this.screens || []).map(screen => screen.name)
    );

    return {
      features: Array.from(featureNames),
      screens: Array.from(screenNames)
    }
  }

  toEnumAndRequired(options: string[], fallback: string, useFallback = false): [boolean, {type: 'string', enum: string[]} |  {$ref: string} ] {
    let required = true
    let type: {type: 'string', enum: string[]} | { $ref: string }

    if(options.length > 0 && !useFallback ) {
      type = {
        type: 'string',
        enum: options
      }

      if(options.length == 1) {
        required = false
      }
    } else {
      type = {
        $ref: `#/$defs/${fallback}`
      }
    }

    return [required, type]
  }

  sourceToObjectType() {
    const properties = {}
    const required = []

    for(const prop of ['widget', 'element', 'action']) {
      properties[prop] = {type:'string'}
    }

    const screensAndFeatures = this.uniqueFeaturesAndScreens()

    const [screenRequired, screenType] = this.toEnumAndRequired(screensAndFeatures.screens, "ScreenNames")

    properties['screen'] = screenType
    if(screenRequired) {
      required.push('screen')
    }

    const [featureRequired, featureType] = this.toEnumAndRequired(screensAndFeatures.features, "FeatureNames")
    properties['feature'] = featureType
    if(featureRequired) {
      required.push('feature')
    }

    const definition = {
      type: 'object',
      properties,
      required
    }

    return new ObjectType(definition as InputTypes.ObjectDefinition)
  }
}

export class Screen extends Event {
  type: "screen"
  tracks: Track[]

  constructor(definition: ScreenDefinition) {
    super({...definition, type: "screen"})
  }
}

export class Track extends Event {
  type: "track"
  features: Feature[]
  screens: Screen[]

  constructor(definition: TrackDefinition) {
    super({...definition, type: "track"})
  }

  toScreenSpecific(screen: Screen) {
    const t = new Track({key: this.key, name: this.name})
    t.features = screen.features
    t.screens = [screen]
    t.properties = this.properties

    return t
  }
}
