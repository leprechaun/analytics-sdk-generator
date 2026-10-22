import login, * as loginTracks from '../output/view/views/Login'
import farmMap from '../output/view/views/FarmMap'

login()
login(null, { url: 'https://example.com/login', widget: 'header' })
farmMap(null, { view: 'FarmMap' })

loginTracks.LoginFailed({ reason: 'timeout' })
loginTracks.LoginFailed({ reason: 'timeout' }, { url: 'https://example.com/login' })
