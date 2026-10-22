import view, * as tracks from '../../output/views/CompanyProfile'

view()
view(null)

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B"]
  }
)
