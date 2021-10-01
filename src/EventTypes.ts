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

    const propertiesObjectDefinition = {
      type: "object",
      properties: definition.properties == undefined ? {} : definition.properties,
      required: definition.required || [],
      additionalProperties: definition.additionalProperties || false
    } as ObjectDefinition


    this.properties = TypeMapper.toSpecificType(
      propertiesObjectDefinition as ObjectDefinition
    ) as ObjectType

    if('description' in definition) {
      this.description = definition.description
    }
  }

  escapeKey() {
    return this.key.replace(" ","").replace("&", "n")
  }

  uniqueFeaturesAndScreens() {
    const featureNamesSet = new Set<string>()
    const screenNamesSet = new Set<string>()

    if('screens' in this) {
      for(const s of this.screens) {
        screenNamesSet.add(s.name)
        for(const f of s.features) {
          featureNamesSet.add(f.name)
        }
      }
    }

    if('features' in this) {
      for(const f of this.features) {
        featureNamesSet.add(f.name)
      }
    }

    const featureNames = Array.from(featureNamesSet)
    const screenNames = Array.from(screenNamesSet)

    return {
      features: featureNames,
      screens: screenNames
    }
  }


  sourceToObjectType() {
    const properties = {}
    const required = []

    for(const prop of ['widget', 'element', 'action']) {
      properties[prop] = {type:'string'}
    }

    const screensAndFeatures = this.uniqueFeaturesAndScreens()

    if(this.type != 'screen' && screensAndFeatures.screens.length > 0) {
      properties['screen'] = {
        type: 'string',
        enum: screensAndFeatures.screens as string[]
      }

      if(screensAndFeatures.screens.length > 1) {
        required.push('screen')
      }
    } else {
      properties['screen'] = {
        $ref: "#/$defs/ScreenNames"
      }
      required.push('screen')
    }

    if(this.type != 'screen' && screensAndFeatures.features.length > 0) {
      properties['feature'] = {
        type: 'string',
        enum: screensAndFeatures.features as string[]
      }

      if(screensAndFeatures.features.length > 1) {
        required.push('feature')
      }
    } else {
      properties['feature'] = {
        $ref: "#/$defs/FeatureNames"
      }
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
