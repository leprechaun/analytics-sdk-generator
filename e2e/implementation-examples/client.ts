import login, * as loginTracks from '../output/implementation/views/Login'
import * as tracks from '../output/implementation/tracks'

login()
loginTracks.LoginFailed({ props: { reason: 'timeout' }, source: { widget: 'form' } })
tracks.LoginFailed({ props: { reason: 'timeout' } })
