import view, * as tracks from '../../output/views/CompanyProfile'

view()
view({ source: { widget: 'menu' } })

tracks.CompanyProfileCompleted({
  props: {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B"]
  }
})
