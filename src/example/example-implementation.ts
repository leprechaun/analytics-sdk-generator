import { Implementation, ViewAttributes, ViewNames, viewAttributes } from '../../output/shared-definitions'

// A Segment-style analytics client: Segment's and RudderStack's libraries both fit
export type AnalyticsClient = {
  page(name: string, properties: object): void
  screen(name: string, properties: object): void
  track(event: string, properties: object): void
}

// Where the current View is remembered: `sessionStorage` on the web survives a reload, but not a new tab
export type ViewStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type CurrentView = { name?: ViewNames, url?: string }

const key = 'analytics.currentView'

// Completes each Event with what the generated SDK can't know (it is stateless, see ADR 0003), then reports it:
// where the user is, for Tracks not tied to one View, and where they came from, for View events
export function createImplementation({ client, platform, storage, currentUrl }: {
  client: AnalyticsClient
  platform: 'web' | 'mobile'
  storage: ViewStorage
  currentUrl: () => string | undefined
}): Implementation {
  const current = (): CurrentView => JSON.parse(storage.getItem(key) ?? '{}')

  return event => {
    const previous = current()
    const view: CurrentView & Partial<ViewAttributes> = event.view.name
      ? { ...event.view, url: event.view.url ?? currentUrl() }
      : { ...event.view, name: previous.name, ...(previous.name && viewAttributes[previous.name]), url: event.view.url ?? previous.url }

    if (event.type === 'view') {
      storage.setItem(key, JSON.stringify({ name: view.name, url: view.url }))

      const source = { ...event.source, ...(previous.name && { view: previous.name, url: previous.url }) }
      const report = platform === 'web' ? client.page : client.screen
      report.call(client, event.name, { ...event.properties, view, source })
    } else {
      client.track(event.name, { ...event.properties, view, source: event.source })
    }
  }
}

// Logs instead of reporting; swap the client for Segment's `analytics` to report for real
const console_client: AnalyticsClient = {
  page: (name, properties) => console.log('page', name, properties),
  screen: (name, properties) => console.log('screen', name, properties),
  track: (event, properties) => console.log('track', event, properties)
}

const memory = new Map<string, string>()

export default createImplementation({
  client: console_client,
  platform: typeof window === 'undefined' ? 'mobile' : 'web',
  storage: typeof sessionStorage === 'undefined'
    ? { getItem: key => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value) } }
    : sessionStorage,
  currentUrl: () => typeof location === 'undefined' ? undefined : location.href
})
