import * as EventTypes from './EventTypes'
import TypeMapper from './TypeMapper'
import { ScreenDefinition, TrackDefinition, TypeDefinition } from './InputTypes'

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

  parseScreen(screens, key: string) {
    const screen = new EventTypes.Screen({...screens[key], key} as ScreenDefinition)

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

  getOrCreate(thing: 'features' | 'tracks' | 'screens', key: 'name' | 'key', name: string, newtype: any | undefined) {
    const matches = this[thing as string].filter( (f: EventTypes.Screen | EventTypes.Feature | EventTypes.Track) => f[key] == name)
    if(matches.length == 0) {
      if(newtype) {
        const newthing = new newtype(name)
        this[thing as string].push(newthing)
        return newthing
      } else {
        throw new Error(`Thing(${thing}/${name}) not found`)
      }
    } else {
      return matches[0]
    }
  }

  getFeature(featureName: string) {
    return this.getOrCreate('features', 'name', featureName, EventTypes.Feature)
  }

  getTrack(trackName: string) {
    return this.getOrCreate('tracks', 'key', trackName, undefined)
  }

  getScreen(screenName: string) {
    return this.getOrCreate('screens', 'key', screenName, undefined)
  }
}
