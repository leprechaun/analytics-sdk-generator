import * as EventTypes from './EventTypes'
import TypeMapper from './TypeMapper'
import { EventDefinition, TrackDefinition, TypeDefinition, ViewDefinition } from './InputTypes'
import { Sources } from './Source'

import {
  NamedType,
} from './Types'

export default class TrackingPlan {
  views: EventTypes.View[]
  tracks: EventTypes.Track[]
  defs: NamedType[]
  traits: NamedType[]
  sources: Sources

  constructor(plan: any) {
    this.views = []
    this.tracks = []
    this.defs = []
    this.traits = []
    this.parse(plan)
  }

  parse(plan) {
    this.parseTracks(plan?.tracks)
    if(plan?.screens) {
      throw new Error(`\`screens\` is no longer supported: declare ${Object.keys(plan.screens).join(', ')} under \`views\` instead`)
    }

    this.parseViews(plan?.views)
    this.parseDefs(plan?.$defs)
    this.parseTraits(plan?.traits)
    this.sources = new Sources(plan?.source, this.views.map(view => view.name))
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

  rejectFeatures(definition: Omit<EventDefinition, 'type'>, entry: string) {
    if (definition.features) {
      throw new Error(`\`features\` is no longer supported: declared on ${entry}`)
    }
  }

  parseViews(views) {
    for(const key in views) {
      const definition: ViewDefinition = views[key] ?? {}
      this.rejectFeatures(definition, `View ${key}`)
      if ('on' in definition) {
        throw new Error(`\`on\` is no longer supported: View ${key} is reported as a Screen or a Page by the Implementation`)
      }

      const view = new EventTypes.View({...definition, key})
      for(const trackName of definition.tracks ?? []) {
        const track = this.getTrack(trackName)
        view.tracks.push(track.toViewSpecific(view))
        track.views.push(view)
      }

      this.views.push(view)
    }
  }

  parseTracks(tracks: any) {
    for(const key in tracks) {
      const track = new EventTypes.Track({...tracks[key], key} as TrackDefinition)

      this.rejectFeatures(tracks[key], `Track ${key}`)

      this.tracks.push(track)
    }
  }

  getTrack(trackName: string): EventTypes.Track {
    const match = this.tracks.find(t => t.key === trackName)
    if (!match) throw new Error(`Track not found: ${trackName}`)
    return match
  }
}
