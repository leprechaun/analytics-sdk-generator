import * as tracks from '../output/view-choice/tracks'

tracks.Logout()
tracks.Logout({ source: { element: 'logout-button' } })
tracks.AppOpened({ source: { widget: 'launcher' } })
tracks.Unattached()
