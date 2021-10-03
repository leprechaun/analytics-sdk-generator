import screen, * as tracks from '../output/screens/CompanyProfile'

screen({})

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true,
    sectors: ["F&B"]
  },
  {
    screen: "ScreenThatDoesntExist"
  }
)
