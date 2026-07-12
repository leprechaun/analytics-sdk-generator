import * as EventTypes from './EventTypes'
import TypeMapper from './TypeMapper'
import { EventDefinition, ScreenDefinition, TrackDefinition, TypeDefinition } from './InputTypes'

import {
  NamedType,
} from './Types'

export default class TrackingPlan {
  features: EventTypes.Feature[]
  screens: EventTypes.Screen[]
  tracks: EventTypes.Track[]
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
    this.parseTracks(plan?.tracks)
    this.parseScreens(plan?.screens)
    this.parseDefs(plan?.$defs)
    this.parseTraits(plan?.traits)
  }

  parseTraits(traits) {
    for(const traitName in traits) {
      this.traits.push(
        new NamedType(
          traitName,
          TypeMapper.toSpecificType(traits[traitName]),
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
          TypeMapper.toSpecificType(defs[defName] as TypeDefinition),
          defs[defName].description
        )
      )
    }
  }

  addFeaturesToEvent(definition: EventDefinition, event: EventTypes.Screen | EventTypes.Track) {
    definition.features?.forEach(featureName => {
      const feature = this.getOrCreateFeature(featureName)
      if (event instanceof EventTypes.Screen) {
        feature.screens.push(event)
      } else {
        feature.tracks.push(event)
      }
      event.features.push(feature)
    })
  }

  addTracksToScreen(definition: EventDefinition, screen: EventTypes.Screen) {
    if('tracks' in definition && Array.isArray(definition['tracks'])) {
      for(const trackName of definition['tracks']) {
        const t = this.getTrack(trackName)
        screen.tracks.push(t.toScreenSpecific(screen))
        t.screens.push(screen)
      }
    }
  }

  parseScreen(screens, key: string) {
    const screen = new EventTypes.Screen({...screens[key], key} as ScreenDefinition)

    this.addFeaturesToEvent(screens[key], screen)
    this.addTracksToScreen(screens[key], screen)

    return screen
  }

  parseScreens(screens) {
    for(const key in screens) {
      this.screens.push(
        this.parseScreen(screens, key)
      )
    }
  }

  parseTracks(tracks: any) {
    for(const key in tracks) {
      const track = new EventTypes.Track({...tracks[key], key} as TrackDefinition)

      this.addFeaturesToEvent(tracks[key], track)

      this.tracks.push(track)
    }
  }

  getOrCreateFeature(name: string): EventTypes.Feature {
    const match = this.features.find(f => f.name === name)
    if (match) return match
    const feature = new EventTypes.Feature(name)
    this.features.push(feature)
    return feature
  }

  getTrack(trackName: string): EventTypes.Track {
    const match = this.tracks.find(t => t.key === trackName)
    if (!match) throw new Error(`Track not found: ${trackName}`)
    return match
  }

  getScreen(screenName: string): EventTypes.Screen {
    const match = this.screens.find(s => s.key === screenName)
    if (!match) throw new Error(`Screen not found: ${screenName}`)
    return match
  }
}
