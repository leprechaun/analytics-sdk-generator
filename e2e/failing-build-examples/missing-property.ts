import view, * as tracks from '../../output/views/CompanyProfile'

view()

tracks.CompanyProfileCompleted({
  props: {
    hasAddress: true,
    sectors: ["F&B"]
  }
})
