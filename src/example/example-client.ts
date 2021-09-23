import screen, * as tracks from '../../output/screens/CompanyProfile'

screen({})

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true
  },
  {
    feature: "Account",
    widget: "PoliciesPrompt",
    element: "Accept Button",
    action: "Click"
  }
)

tracks.CompanyProfileCompleted(
  {
    companyType: 'llc',
    hasAddress: true
  }
)
