import TypeMapper from './TypeMapper'
import { EventDefinition, TrackDefinition, ScreenDefinition, ObjectDefinition } from './InputTypes'
import { ObjectType } from './Types'
import { EventViews } from './Source'

export class Feature {
  name: string
  screens: Screen[]
  pages: Page[]
  tracks: Track[]

  constructor(name: string, screens: Screen[] = [], tracks: Track[] = []) {
    this.name = name;
    this.screens = screens;
    this.pages = [];
    this.tracks = tracks;
  }

  addScreen(screen: Screen) {
    this.screens.push(screen)
  }

  addTrack(track: Track) {
    this.tracks.push(track)
  }
}

export type ViewKind = "screen" | "page"
export const viewKinds: ViewKind[] = ["screen", "page"]

// A place the user can be in the product, declared once; it appears as a Screen, a Page, or both
export class View {
  key: string
  name: string
  on: ViewKind[]
  definition: ScreenDefinition

  constructor(key: string, definition: ScreenDefinition, on: ViewKind[]) {
    this.key = key
    this.name = definition.name || key
    this.on = on
    this.definition = definition
  }
}

export type EventType  = "screen" | "page" | "track"

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


  constructor({
    key, 
    type, 
    name, 
    description, 
    loginRequired, 
    additionalProperties = false, 
    properties, 
    required
  }: EventDefinition) {
    if (!key) throw new Error("'key' is required");
    if (!type) throw new Error("'type' is required");

    this.features = [];
    this.tracks = [];
    this.screens = [];
    this.additionalProperties = additionalProperties;
    this.loginRequired = loginRequired;
    this.type = type;
    this.key = key;
    this.name = name || key;
    this.description = description;
    this.properties = this.parseProperties({ key, type, name, description, loginRequired, additionalProperties, properties, required });
  }

  parseProperties(definition: EventDefinition) {
    const propertiesObjectDefinition: ObjectDefinition = {
      type: "object",
      properties: definition.properties ?? {},
      required: definition.required ?? [],
      additionalProperties: definition.additionalProperties ?? false
    };

    return TypeMapper.toSpecificType(propertiesObjectDefinition) as ObjectType;
  }

  escapeKey() {
    return this.key.replace(/[ &]/g, match => match === ' ' ? '' : 'n');
  }
}

export class Screen extends Event {
  type: "screen"
  tracks: Track[]

  constructor(definition: ScreenDefinition) {
    super({...definition, type: "screen"})
  }

  // A Screen view is always fired from the Screen itself
  eventViews(): EventViews {
    return { screens: [this.name], pages: [], features: this.features.map(f => f.name) }
  }
}

export class Page extends Event {
  type: "page"

  constructor(definition: ScreenDefinition) {
    super({...definition, type: "page"})
  }

  // A Page view is always fired from the Page itself
  eventViews(): EventViews {
    return { screens: [], pages: [this.name], features: this.features.map(f => f.name) }
  }
}

export class Track extends Event {
  type: "track"
  features: Feature[]
  screens: Screen[]
  pages: Page[] = []

  constructor(definition: TrackDefinition) {
    super({...definition, type: "track"})
  }

  // The Screens and Pages it is attached to, and every Feature it or they belong to
  eventViews(): EventViews {
    return {
      screens: this.screens.map(screen => screen.name),
      pages: this.pages.map(page => page.name),
      features: Array.from(new Set([
        ...this.features,
        ...this.screens.flatMap(screen => screen.features),
        ...this.pages.flatMap(page => page.features)
      ].map(feature => feature.name)))
    }
  }

  toScreenSpecific(screen: Screen) {
    const t = new Track({key: this.key, name: this.name})
    t.features = screen.features
    t.screens = [screen]
    t.properties = this.properties

    return t
  }

  toPageSpecific(page: Page) {
    const t = new Track({key: this.key, name: this.name})
    t.features = page.features
    t.pages = [page]
    t.properties = this.properties

    return t
  }
}
