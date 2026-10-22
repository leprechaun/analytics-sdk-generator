import view, * as tracks from '../../output/views/CompanyProfile'

view()

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B-invalid"]
  }
)
