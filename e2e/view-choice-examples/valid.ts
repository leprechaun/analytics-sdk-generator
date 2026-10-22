import * as tracks from '../output/view-choice/tracks'

tracks.Logout(null, { view: 'Login' })
tracks.Logout(null, { view: 'FarmMap', url: 'https://example.com/map' })
tracks.AppOpened()
tracks.AppOpened(null, { widget: 'launcher' })
tracks.Unattached(null, { view: 'Splash' })
