import * as EventTypes from './EventTypes'
import TypeMapper from './TypeMapper'
import { EventDefinition, ObjectDefinition, ScreenDefinition, TrackDefinition, TypeDefinition } from './InputTypes'
import { defaultSourceDefinition, reservedSourceAttributes } from './Source'

import {
  NamedType,
} from './Types'

export default class TrackingPlan {
  features: EventTypes.Feature[]
  views: EventTypes.View[]
  screens: EventTypes.Screen[]
  pages: EventTypes.Page[]
  tracks: EventTypes.Track[]
  defs: NamedType[]
  traits: NamedType[]
  source: ObjectDefinition

  constructor(plan: any) {
    this.features = []
    this.views = []
    this.screens = []
    this.pages = []
    this.tracks = []
    this.defs = []
    this.traits = []
    this.source = defaultSourceDefinition
    this.parse(plan)
  }

  parse(plan) {
    this.parseTracks(plan?.tracks)
    const declaredTwice = Object.keys(plan?.screens ?? {}).filter(key => key in (plan?.views ?? {}))
    if(declaredTwice.length > 0) {
      throw new Error(`View declared in both \`screens\` and \`views\`: ${declaredTwice.join(', ')}`)
    }

    this.parseViews(plan?.screens, () => ['screen'])
    this.parseViews(plan?.views, view => view.on ?? EventTypes.viewKinds)
    this.parseScreens()
    this.parsePages()
    this.parseDefs(plan?.$defs)
    this.parseTraits(plan?.traits)
    this.parseSource(plan?.source)
  }

  parseSource(source) {
    if(source) {
      const reserved = Object.keys(source.properties ?? {}).filter(name => reservedSourceAttributes.includes(name))
      if(reserved.length > 0) {
        throw new Error(`Reserved Source attributes cannot be declared in \`source\`: ${reserved.join(', ')}`)
      }

      this.source = { type: 'object', ...source }
    }
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

  addFeaturesToEvent(definition: Omit<EventDefinition, 'type'>, event: EventTypes.Screen | EventTypes.Page | EventTypes.Track) {
    definition.features?.forEach(featureName => {
      const feature = this.getOrCreateFeature(featureName)
      if (event instanceof EventTypes.Screen) {
        feature.screens.push(event)
      } else if (event instanceof EventTypes.Page) {
        feature.pages.push(event)
      } else {
        feature.tracks.push(event)
      }
      event.features.push(feature)
    })
  }

  addTracksToScreen(definition: ScreenDefinition, screen: EventTypes.Screen) {
    if('tracks' in definition && Array.isArray(definition['tracks'])) {
      for(const trackName of definition['tracks']) {
        const t = this.getTrack(trackName)
        screen.tracks.push(t.toScreenSpecific(screen))
        t.screens.push(screen)
      }
    }
  }

  parseViews(views, kindsOf: (definition) => EventTypes.ViewKind[]) {
    for(const key in views) {
      const definition = views[key] ?? {}
      const kinds = kindsOf(definition)

      const unknown = kinds.filter(kind => !EventTypes.viewKinds.includes(kind))
      if(unknown.length > 0) {
        throw new Error(`Unknown kind in \`on\` for View ${key}: ${unknown.join(', ')}`)
      }

      this.views.push(new EventTypes.View(key, definition, kinds))
    }
  }

  parseScreen(view: EventTypes.View) {
    const screen = new EventTypes.Screen({...view.definition, key: view.key} as ScreenDefinition)

    this.addFeaturesToEvent(view.definition, screen)
    this.addTracksToScreen(view.definition, screen)

    return screen
  }

  parseScreens() {
    for(const view of this.views.filter(v => v.on.includes('screen'))) {
      this.screens.push(
        this.parseScreen(view)
      )
    }
  }

  parsePages() {
    for(const view of this.views.filter(v => v.on.includes('page'))) {
      const page = new EventTypes.Page({...view.definition, key: view.key} as ScreenDefinition)

      this.addFeaturesToEvent(view.definition, page)

      this.pages.push(page)
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
