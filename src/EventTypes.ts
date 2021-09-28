import TypeMapper from './TypeMapper'
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


  constructor(definition: EventDefinition) {
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
}

export class Screen extends Event {
  type: "screen"
  tracks: Track[]

  constructor(definition: ScreenDefinition) {
    super({...definition, type: "screen"})

    this.features = []
    this.tracks = []
  }
}

export class Track extends Event {
  type: "track"
  features: Feature[]
  screens: Screen[]

  constructor(definition: TrackDefinition) {
    super({...definition, type: "track"})

    this.features = []
    this.screens = []
  }

  toScreenSpecific(screen: Screen) {
    const t = new Track({key: this.key, name: this.name})
    t.features = screen.features
    t.screens = [screen]
    t.properties = this.properties

    return t
  }
}
