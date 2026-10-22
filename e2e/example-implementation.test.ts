import { createImplementation } from '../src/example/example-implementation'

// The example Implementation completes each Event, then hands it to a Segment-style analytics client
describe('the example Implementation', () => {
  const memoryStorage = () => {
    const items = new Map<string, string>()
    return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value) } }
  }

  const setup = (platform: 'web' | 'mobile', storage = memoryStorage()) => {
    const client = { page: jest.fn(), screen: jest.fn(), track: jest.fn() }
    let url = 'https://farm.app/login'
    const implementation = createImplementation({ client, platform, storage, currentUrl: () => url })
    return { client, implementation, navigate: (to: string) => { url = to } }
  }

  it('completes the View and where the user came from, through a navigation', async () => {
    const { client, implementation, navigate } = setup('web')

    await implementation({ type: 'view', name: 'Login', properties: null, view: { name: 'Login', section: 'onboarding' }, source: {} })
    await implementation({ type: 'track', name: 'LoginFailed', properties: { provider: 'auth0', reason: 'timeout' }, view: {}, source: { widget: 'login-form' } })
    navigate('https://farm.app/profile')
    await implementation({ type: 'view', name: 'UserProfile', properties: null, view: { name: 'UserProfile', section: 'account' }, source: { widget: 'login-form', action: 'submit' } })
    await implementation({ type: 'track', name: 'UserProfileCompleted', properties: null, view: {}, source: {} })

    expect(client.page.mock.calls).toEqual([
      ['Login', {
        view: { name: 'Login', section: 'onboarding', url: 'https://farm.app/login' },
        source: {}
      }],
      ['UserProfile', {
        view: { name: 'UserProfile', section: 'account', url: 'https://farm.app/profile' },
        source: { widget: 'login-form', action: 'submit', view: 'Login', url: 'https://farm.app/login' }
      }]
    ])
    expect(client.track.mock.calls).toEqual([
      ['LoginFailed', {
        provider: 'auth0',
        reason: 'timeout',
        view: { name: 'Login', section: 'onboarding', url: 'https://farm.app/login' },
        source: { widget: 'login-form' }
      }],
      ['UserProfileCompleted', {
        view: { name: 'UserProfile', section: 'account', url: 'https://farm.app/profile' },
        source: {}
      }]
    ])
  })

  it('reports View events as Screens on mobile', async () => {
    const { client, implementation } = setup('mobile')

    await implementation({ type: 'view', name: 'Login', properties: null, view: { name: 'Login' }, source: {} })

    expect(client.page).not.toHaveBeenCalled()
    expect(client.screen).toHaveBeenCalledWith('Login', expect.objectContaining({ view: expect.objectContaining({ name: 'Login' }) }))
  })

  it('remembers the current View across a reload, through its storage', async () => {
    const storage = memoryStorage()
    await setup('web', storage).implementation({ type: 'view', name: 'Login', properties: null, view: { name: 'Login' }, source: {} })

    const { client, implementation } = setup('web', storage)
    await implementation({ type: 'view', name: 'UserProfile', properties: null, view: { name: 'UserProfile' }, source: {} })

    expect(client.page).toHaveBeenCalledWith('UserProfile', expect.objectContaining({
      source: { view: 'Login', url: 'https://farm.app/login' }
    }))
  })
})
