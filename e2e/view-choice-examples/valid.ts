import * as tracks from '../output/view-choice/tracks'

tracks.Logout(null, { screen: 'Splash' })
tracks.Logout(null, { page: 'FarmMap', url: 'https://example.com/map' })
tracks.Logout(null, { page: 'Login' })
tracks.LoginFailed(null, { screen: 'Login' })
tracks.LoginFailed(null, { page: 'Login' })
tracks.AppOpened()
tracks.AppOpened(null, { widget: 'launcher' })
