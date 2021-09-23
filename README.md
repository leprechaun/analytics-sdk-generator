# Analytics-SDK Generator

[![Maintainability](https://api.codeclimate.com/v1/badges/f17aec547af3af22902c/maintainability)](https://codeclimate.com/github/leprechaun/analytics-sdk-generator/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/f17aec547af3af22902c/test_coverage)](https://codeclimate.com/github/leprechaun/analytics-sdk-generator/test_coverage)

This project is a convenient for developers, data analysts and engineers alike.

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
  --implemenmtation ./src/example/example-implementation
yarn ts-node src/example/example-client.ts
```

The transliterate command parses your analytics schema in `./src/example/example-schema.yml`, generates the code, and writes it to `./output`. Specifying `--implementation` is meant to specify a file whose default export is your analytics reporter implementation; by default, itonly does `console.log(...)`

## Schema format

The format was designed to expose as much json-schema as possible, while reducing verbosity. Any event property, trait, or shared definition is intended to be full json-schema 2019-09, but implementation is incomplete.

The file is divided in 4 sections.

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

### Screens

Screens (and Tracks) are the two main event types, and as such are first class citizens.

```
screens:
  Welcome:
    name: welcome screen
    features:
    - Onboarding
    description: |
      This screen is the first screens users see when using the app.
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
    - AnotherScreen
```

`Welcome` is the event key. It will be used as the function names, and should be a valid javascript variable name.

`name: welcome` is the event name. The default is to re-use the event key.

`features` is a list of features this event is associated with.

`description` allows you to describe this event in free text. It will be included as a comment in the code, potentially displayed by your IDEs auto-suggestion.

`properties` are the properties this event is expected to have. All properties are expressed in json-schema form.

`required` is the list of property names that must be present in the event. It defaults to empty. Any property listed will be non-optional in the property types generated.

`tracks` is a list of `track` type events associated to this screen. Each event listed here will also result in an additional function in the screen function files.

`links` is a list of `screen` type events associated with this screen, typically screens a user can navigate to from here.

### Tracks

Tracks are events that can be emitted based on user interactions with your app that are not navigation based. The format is identical, except there are no `links`.

```
tracks:
  SomeTrack:
    features:
    - Onboarding
    description: |
      This event is emitted when something happens
    properties:
      some_property:
        description: Wether this is the first time the user opens the app
        type: boolean
```


## Using the code

Look at `./src/examples/example-client.ts`.

All `screen` events will result in a file in `./$outputDirectory/screens/$EventKey.ts`. The default export will be the analytics function that emits that screen event.

All `track` events associated with this screen will also be included in this file, exported by name.

```
import screen, * as tracks from './$outputDirectory/screens/Welcome'

//  emit type: screen, name: welcome screen, {is_first_open,another_property}
screen({is_first_open: true, another_property: "some string"})

//  emit type: track, name: SomeTrack, {some_property}
tracks.SomeTrack({some_property: "another property"})
```
