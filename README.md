# Analytics-SDK Generator

[![Maintainability](https://api.codeclimate.com/v1/badges/f17aec547af3af22902c/maintainability)](https://codeclimate.com/github/leprechaun/analytics-sdk-generator/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/f17aec547af3af22902c/test_coverage)](https://codeclimate.com/github/leprechaun/analytics-sdk-generator/test_coverage) [![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fleprechaun%2Fanalytics-sdk-generator%2Fmaster)](https://dashboard.stryker-mutator.io/reports/github.com/leprechaun/analytics-sdk-generator/master) [![npm version](https://badge.fury.io/js/analytics-sdk-generator.svg)](https://www.npmjs.com/package/analytics-sdk-generator)

This project is a convenience for developers, data analysts and engineers alike.

It takes in a yaml file describing a mobile application and the analytics events that should be sent, and generates a corresponding type-checked SDK.

## Try it out

### Installing

```
yarn add analytics-sdk-generator
yarn analytics-sdk-generator transliterate --output ./output --input ./src/example/example-schema.yml
```

### Locally

```
# git clone ...
yarn install
yarn ts-node src/bin/cli.ts transliterate \
  --input src/example/example-schema.yml \
  --output ./output \
  --methodsAsync (true|false) \
  --implementation ./src/example/example-implementation
yarn ts-node src/example/example-client.ts
```

The transliterate command parses your analytics schema in `./src/example/example-schema.yml`, generates the code, and writes it to `./output`. Specifying `--implementation` is meant to specify a file whose default export is your analytics reporter implementation; by default, it only does `console.log(...)`. Its default export must be an `Implementation` (see The implementation, below). `--methodsAsync true|false` will mark all methods as asynchronous and await the implementation.

## Schema format

The format was designed to expose as much json-schema as possible, while reducing verbosity. Any event property, trait, or shared definition is intended to be full json-schema 2019-09, but implementation is incomplete.

### Supported Types

#### String

```
type: string
enum: [...]
format: $format
```

##### Enum

Enums with only one option will be treated as a constant.

##### Format

For now, only `date-time` is supported.

#### Number

```
type: number | integer
```

Because javascript doesnt' really distinguish between numbers and integers, they are effectively aliases. Downstream validation tooling can support that distinction, though.

`min`, `max`, `multipleOf` and other constraints are not supported, but it could be done downstream.

#### Array

```
type: array
items: $TypeDefinition
```

Arrays can point to any supported type.

`minItems`, `maxItems` is not supported. Perhaps it both `min` and `max` are supported, one could define a typescript tuple.

#### Object

```
type: object
required: []
properties:
  someprop: $TypeDefinition
additionalProperties: false
```

There is basic support for objects. Properties can point to any supported typedefinition. AdditionalProperties is always assumed false, for the time being. Newer json-schema features on objects are not supported.

#### OneOf

```
oneOf:
  - TypeDefinition1
  - TypeDefinition2
```

One of create a union type between any supported data type. Unions of only one type will result in only that one type.

## File sections

The file is divided in 7 sections.

### Header

```
application:
  name: My Application
  version: 1.2.3
```

### $defs

JSON-Schema 2019-09 changed `definitions` to `$defs`. Any type defined here can be reused throughout the schema file using the usual `$ref: "#/$defs/YourThing"`

```
$defs:
  AnotherThing:
    type: string
    format: uuid

  YourThing:
    type: object
    properties:
      key1:
        type: string
      key2:
        $ref: "#/$defs/AnotherThing"
```

### Traits

Traits are key values set on a per-user basis, not on events.

```
traits:
  user_type:
    type: string
    enum:
    - manager
    - owner
    - end_user
  users_thing:
    $ref: "#/$defs/YourThing"
```

### Source

Every event can be given a `source`, describing what caused it. Source attributes default to `widget`, `element` and `action`, all optional strings.

To use your own source attributes instead, declare a `source` block. It is an object in json-schema form, like event `properties`, and **replaces** the defaults entirely.

```
source:
  required:
  - campaign
  properties:
    campaign:
      $ref: "#/$defs/Campaign"
    placement:
      type: string
      enum:
      - header
      - footer
```

`required` lists the source attributes every event must be given. Any source attribute not declared here is rejected at compile time.

`view` and `url` are reserved for your implementation, which sets them to the view the user came from and its URL (see The implementation, below). Declaring either in `source` fails the build.

A source attribute can't be a `const`: facts about the build, such as the platform, belong to your implementation, so declaring one fails the build.

### View attributes

View attributes are facts about a view, such as the section of the product it belongs to. Declare them once in `view_attributes`, an object in json-schema form like `source`, and set each view's values under its `attributes`:

```
view_attributes:
  required:
  - section
  properties:
    section:
      type: string
      enum:
      - onboarding
      - farming

views:
  FarmMap:
    attributes:
      section: farming
```

Every event on a view carries its attributes alongside its name: `view: {name: "FarmMap", section: "farming"}`. A view setting an undeclared attribute, a value that doesn't fit its declaration (its `type` or `enum`), or leaving out a required one fails the build. `name` and `url` are reserved.

### Views

A view is a place the user can be in your product, declared once whatever the platform. The generated SDK reports a `view` event; your implementation decides whether to report it as a screen (in a mobile app) or a page (on a website), e.g. with Segment's `screen()` or `page()`.

Views (and Tracks) are the two main event types, and as such are first class citizens.

```
views:
  Welcome:
    name: welcome screen
    description: |
      This is the first view users see when using the app.
    properties:
      is_first_open:
        description: Wether this is the first time the user opens the app
        type: boolean
      another_property:
        type: boolean
    required:
      - another_property
    tracks:
    - SomeTrack
    links:
    - AnotherView
```

`on`, which used to list the kinds a view appeared as, and `screens`, which used to declare views appearing only as screens, are no longer supported: either fails the build.

`Welcome` is the event key. It will be used as the function names, and should be a valid javascript variable name.

`name: welcome` is the event name. The default is to re-use the event key.

`description` allows you to describe this event in free text. It will be included as a comment in the code, potentially displayed by your IDEs auto-suggestion.

`properties` are the properties this event is expected to have. All properties are expressed in json-schema form.

`required` is the list of property names that must be present in the event. It defaults to empty. Any property listed will be non-optional in the property types generated.

`tracks` is a list of `track` type events associated to this view. Each event listed here will also result in an additional function in the view's file.

`links` is a list of views associated with this view, typically views a user can navigate to from here.

### Tracks

Tracks are events that can be emitted based on user interactions with your app that are not navigation based. The format is identical, except there are no `links`.

```
tracks:
  SomeTrack:
    description: |
      This event is emitted when something happens
    properties:
      some_property:
        description: Wether this is the first time the user opens the app
        type: boolean
```


## Using the code

Look at `./src/examples/example-client.ts`.

Every view results in a file in `./$outputDirectory/views/$EventKey.ts`. The default export is the analytics function that emits that view event. All `track` events associated with this view are also included in this file, exported by name.

Every helper takes one argument: `props`, the event's properties, and `source`, what caused it. `props` is only accepted when the event has properties, and required when one of them is; `source` is required when your `source` block requires an attribute. When nothing is required, the argument can be left out altogether.

```
import view, * as tracks from './$outputDirectory/views/Welcome'

view({props: {is_first_open: true, another_property: "some string"}})
tracks.SomeTrack({props: {some_property: "another property"}, source: {widget: "menu"}})
```

Every `track` event is also exported by name from `./$outputDirectory/tracks.ts`, not tied to any one view.

```
import * as tracks from './$outputDirectory/tracks'

tracks.LoginFailed({props: {reason: "timeout"}, source: {widget: "login-form"}})
```

### The implementation

Every helper hands your implementation one event, with its parts kept separate:

```
{
  type: "view",                       // or "track"
  name: "Welcome",
  properties: {is_first_open: true, another_property: "some string"},
  view: {name: "Welcome"},            // the view it happened on
  source: {widget: "menu"}            // what caused it, as passed by the caller
}
```

The generated SDK is stateless (see `docs/adr/0003-stateless-sdk-navigation-in-the-implementation.md`), so it fills in only what your Tracking Plan determines, and leaves the rest of the event for your implementation to complete:

| | Filled in by the generated SDK | Completed by your implementation |
|---|---|---|
| `view.name` | when the helper belongs to exactly one view: view events, and tracks exported from a view's file | for tracks on several views, or none: the current view |
| View attributes in `view` | when `view.name` is filled in | along with `view.name`, from `viewAttributes` |
| `view.url` | never | the current URL, e.g. `location.href` |
| `source.view`, `source.url` | never | on view events: the view the user came from, and its URL |
| the rest of `source` | as passed by the caller | |

`shared-definitions.ts` exports the event's type, `AnalyticsEvent`, and the implementation's, `Implementation`, so your implementation can be checked against your Tracking Plan.

`AnalyticsEvent` has one member per view and per track. Narrow an event on its `type` and `name` (a view and a track may share a name) to get its properties, and the views it can happen on, typed by your Tracking Plan:

```
if (event.type === 'track' && event.name === 'LoginFailed') {
  event.properties.reason      // string | undefined
  event.view.name              // "Login" | "Signup" | undefined
}
```

Since `view.name` is narrowed per event, complete the view in a copy, e.g. `const view: {name?: ViewNames, url?: string} & Partial<ViewAttributes> = {...event.view, name: current}`, rather than writing to `event.view`.

`./src/example/example-implementation.ts` is a complete example. It remembers the current view (in `sessionStorage` on the web, so it survives a reload), completes each event as above, and reports view events as pages on the web and screens on mobile, using a Segment-style client:

```
import { createImplementation } from './example-implementation'

export default createImplementation({
  client: analytics,                  // Segment's or RudderStack's
  platform: 'web',
  storage: sessionStorage,
  currentUrl: () => location.href
})
```

`shared-definitions.ts` also lists the names of every view (`ViewNames`), and every view's View attributes (`viewAttributes`, keyed by view name), so your implementation can complete `view` for tracks on several views. A list with no names is `never`.

Features are no longer supported: declaring `features` on a view or track fails the build.
