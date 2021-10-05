import screen, * as tracks from '../../output/screens/CompanyProfile'

screen()
screen(null)

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B"]
  }
)
