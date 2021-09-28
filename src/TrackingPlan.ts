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

  parseScreens(screens) {
    for(const key in screens) {
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

      this.screens.push(screen)
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

  getFeature(featureName: string) {
    const matchingFeatures = this.features.filter( f => f.name == featureName )
    if(matchingFeatures.length == 0) {
      const feature = new EventTypes.Feature(featureName)
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
