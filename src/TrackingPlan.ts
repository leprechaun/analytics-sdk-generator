import BaseType, { ObjectType, NamedType } from './Types'

export default class TrackingPlan {
  features: Feature[]
  screens: Screen[]
  tracks: Track[]
  defs: NamedType[]
  traits: NamedType[]

  constructor(plan: any) {
    this.features = []
    this.screens = []
    this.tracks = []
    this.defs = []
    this.traits = []
    this.parse(plan)
  }

  parse(plan) {
    this.parseTracks(plan['tracks'])
    this.parseScreens(plan['screens'])
    this.parseDefs(plan['$defs'])
    this.parseTraits(plan['traits'])
  }

  parseTraits(traits) {
    for(const traitName in traits) {
      this.traits.push(
        new NamedType(
          traitName,
          BaseType.toSpecificType(traits[traitName]),
          traits[traitName].description
        )
      )
    }
  }

  parseDefs(defs) {
    for(const defName in defs) {
      this.defs.push(
        new NamedType(
          defName,
          BaseType.toSpecificType(defs[defName]),
          defs[defName].description
        )
      )
    }
  }

  parseScreens(screens) {
    for(const key in screens) {
      const screen = new Screen({...screens[key], key})

      if('features' in screens[key]) {
        for(const featureName of screens[key]['features']) {
          const feature = this.getFeature(featureName)

          feature.addScreen(screen)
          screen.features.push(feature)
        }
      }

      if('tracks' in screens[key]) {
        for(const trackName of screens[key]['tracks']) {
          const t = this.getTrack(trackName)
          screen.tracks.push(t.toScreenSpecific(screen))
          t.screens.push(screen)
        }
      }

      this.screens.push(screen)
    }
  }

  parseTracks(tracks: any) {
    for(const key in tracks) {
      const track = new Track({...tracks[key], key})

      if('features' in tracks[key]) {
        for(const featureName of tracks[key]['features']) {
          const feature = this.getFeature(featureName)
          feature.addTrack(track)
          track.features.push(feature)
        }
      }

      this.tracks.push(track)
    }
  }

  getFeature(featureName: string) {
    const matchingFeatures = this.features.filter( f => f.name == featureName )
    if(matchingFeatures.length == 0) {
      const feature = new Feature(featureName)
      this.features.push(feature)
      return feature
    } else {
      return matchingFeatures[0]
    }
  }

  getTrack(trackName: string) {
    const matchingTracks = this.tracks.filter( f => f.key == trackName )
    if(matchingTracks.length == 0) {
      throw new Error("Track not found: " + trackName)
    } else {
      return matchingTracks[0]
    }
  }

  getScreen(screenName: string) {
    const matchingScreens = this.screens.filter( f => f.key == screenName )
    if(matchingScreens.length == 0) {
      throw new Error("Screen not found: " + screenName)
    } else {
      return matchingScreens[0]
    }
  }
}

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

export enum EventType {
  screen = "screen",
  track = "track"
}

export class Event {
  type: EventType
  key: string
  name: string
  description?: string
  additionalProperties: boolean
  loginRequired?: boolean
  properties: ObjectType
  features: Feature[]


  constructor(definition) {
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
    this.properties = BaseType.toSpecificType({
      type: "object",
      properties: definition.properties || {},
      required: definition.required || [],
      additionalProperties: definition.additionalProperties || false
    }) as ObjectType

    if('description' in definition) {
      this.description = definition.description
    }
  }

  escapeKey() {
    return this.key.replace(" ","").replace("&", "n")
  }
}

export class Screen extends Event {
  type = EventType.screen
  tracks: Track[]

  constructor(definition) {
    super({...definition, type: "screen"})

    this.features = []
    this.tracks = []
  }
}

export class Track extends Event {
  type = EventType.track
  features: Feature[]
  screens: Screen[]

  constructor(definition) {
    super({...definition, type: "track"})

    this.features = []
    this.screens = []
  }

  toScreenSpecific(screen: Screen) {
    const t = new Track({...this, properties: {}})
    t.features = screen.features
    t.screens = [screen]
    t.properties = this.properties

    return t
  }
}
