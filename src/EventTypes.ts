import TypeMapper from './TypeMapper'
import * as InputTypes from './InputTypes'
import { EventDefinition, TrackDefinition, ScreenDefinition, ObjectDefinition } from './InputTypes'
import { ObjectType } from './Types'

export class Feature {
  name: string
  screens: Screen[]
  tracks: Track[]

  constructor(name: string, screens: Screen[] = [], tracks: Track[] = []) {
    this.name = name;
    this.screens = screens;
    this.tracks = tracks;
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

  uniqueFeaturesAndScreens() {
    const featureNames = new Set([
      ...(this.screens || []).flatMap(screen => screen.features.map(f => f.name)),
      ...(this.features || []).map(f => f.name)
    ]);

    const screenNames = new Set(
      (this.screens || []).map(screen => screen.name)
    );

    return {
      features: Array.from(featureNames),
      screens: Array.from(screenNames)
    }
  }

  toEnumAndRequired(options: string[], fallback: string, useFallback = false): [boolean, {type: 'string', enum: string[]} |  {$ref: string} ] {
    let required = true
    let type: {type: 'string', enum: string[]} | { $ref: string }

    if(options.length > 0 && !useFallback ) {
      type = {
        type: 'string',
        enum: options
      }

      if(options.length == 1) {
        required = false
      }
    } else {
      type = {
        $ref: `#/$defs/${fallback}`
      }
    }

    return [required, type]
  }

  sourceToObjectType() {
    const screensAndFeatures = this.uniqueFeaturesAndScreens();
    
    const properties = {
      widget: {type: 'string'},
      element: {type: 'string'},
      action: {type: 'string'}
    };

    const required = [];

    const [screenRequired, screenType] = this.toEnumAndRequired(screensAndFeatures.screens, "ScreenNames");
    properties['screen'] = screenType;
    if (screenRequired) required.push('screen');

    const [featureRequired, featureType] = this.toEnumAndRequired(screensAndFeatures.features, "FeatureNames");
    properties['feature'] = featureType;
    if (featureRequired) required.push('feature');

    return new ObjectType({
      type: 'object',
      properties,
      required
    } as InputTypes.ObjectDefinition);
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
