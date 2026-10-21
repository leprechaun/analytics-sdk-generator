import login from '../output/page/pages/Login'
import farmMap from '../output/page/pages/FarmMap'

login()
login(null, { url: 'https://example.com/login', widget: 'header' })
farmMap(null, { page: 'FarmMap', feature: 'Onboarding' })
