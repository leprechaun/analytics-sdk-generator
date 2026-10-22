import view, * as tracks from '../../output/views/CompanyProfile'

view()

tracks.CompanyProfileCompleted({
  props: {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B"]
  },
  source: {
    view: "ViewThatDoesntExist"
  }
})
