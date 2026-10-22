import login, * as loginTracks from '../output/view/views/Login'
import farmMap from '../output/view/views/FarmMap'

login()
login({ source: { widget: 'header' } })
farmMap({ source: { widget: 'menu' } })

loginTracks.LoginFailed({ props: { reason: 'timeout' } })
loginTracks.LoginFailed({ props: { reason: 'timeout' }, source: { action: 'submit' } })
