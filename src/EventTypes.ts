import TypeMapper from './TypeMapper'
import { EventDefinition, TrackDefinition, ViewDefinition, ObjectDefinition } from './InputTypes'
import { ObjectType } from './Types'
import { EventViews } from './Source'

export type EventType = "view" | "track"

export class Event {
  type: EventType
  key: string
  name: string
  description?: string
  additionalProperties: boolean
  loginRequired?: boolean
  properties: ObjectType


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

// A distinct place the user can be in the product; reported as a Screen or a Page by the Implementation
export class View extends Event {
  type: "view"
  tracks: Track[] = []

  constructor(definition: ViewDefinition) {
    super({...definition, type: "view"})
  }

  // A View event is always fired from the View itself
  eventViews(): EventViews {
    return { views: [this.name] }
  }
}

export class Track extends Event {
  type: "track"
  views: View[] = []

  constructor(definition: TrackDefinition) {
    super({...definition, type: "track"})
  }

  // The Views it is attached to
  eventViews(): EventViews {
    return { views: this.views.map(view => view.name) }
  }

  toViewSpecific(view: View) {
    const t = new Track({key: this.key, name: this.name})
    t.views = [view]
    t.properties = this.properties

    return t
  }
}
