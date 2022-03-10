var test = require('ava')
var httpMocks = require('node-mocks-http')

var cookie = require('../lib/cookie')
var parseSafelyJSON = require('../lib/utils/parse-json-safely')
test.cb('should cut cookie if it exceeds the maximum allowed cookie size  ', function (t) {
  var arborist = {
    'nDaysLastSeenTarget:Aspiration_LongIslandWebDesgin': '2019-04-25',
    'nDaysLastSeenTarget:Funnel_Lending': '2019-06-06',
    'nDaysLastSeenTarget:test_accept_office_ip': '2019-07-08',
    'nDaysLastSeenTarget:Path.Money - Earn Cash Bonuses with New Bank Accounts': '2019-05-07',
    'nDaysLastSeenTarget:Path.Money_how-to-get-approved-for-a-loan': '2019-06-05',
    'nDaysLastSeenTarget:Path.Money_how-to-save-on-auto-insurance_3rdParty': '2019-05-16',
    'nDaysLastSeenTarget:Path.Money_how-to-save-on-auto-insurance_Internal': '2019-05-16',
    'nDaysLastSeenTarget:interlincx_push_AvenueLink_PrismLoans': '2019-05-20',
    'nDaysLastSeenTarget:Path.Money_perks-of-having-an-online-checking-account - MediaBuy': '2019-06-03',
    'nDaysLastSeenTarget:Path.Money_how-to-open-a-checking-account - MediaBuy': '2019-06-06',
    'nDaysLastSeenTarget:path.money_getting-approved-for-a-credit-card-with-bad-credit_Compliance': '2019-06-06',
    'nDaysLastSeenTarget:Path.Money_this-is-what-you-need-to-know-about-a-personal-loan - MediaBuy': '2019-06-06',
    'nDaysLastSeenTarget:Path.Money_personal-loan-vs-credit-card-which-is-right-for-you - MediaBuy': '2019-06-05',
    'nDaysLastSeenTarget:Path.Money_peer-to-peer-lending - MediaBuy': '2019-06-05',
    'nDaysLastSeenTarget:path.money_uberEats': '2019-06-10',
    'nDaysLastSeenTarget:path.money_uberEat_default': '2019-06-06',
    'nDaysLastSeenTarget:path.money_best-cash-back-credit-cards_uPush': '2019-06-09',
    'nDaysLastSeenTarget:path.money_everything-you-need-to-know-about-opening-a-bank-account-in-australia_default': '2019-06-11',
    'nDaysLastSeenTarget:AdVatiz_MyCreditCardHelper_BadCredit': '2019-06-25',
    'nDaysLastSeenTarget:AdVatiz_LowIncomeCarHelp': '2019-06-25'
  }

  var expectedArborist = { 'nDaysLastSeenTarget:AdVatiz_LowIncomeCarHelp': '2019-06-25' }
  var req = httpMocks.createRequest()
  var res = httpMocks.createResponse()
  res.headers = { cookies: {} }
  var jsonArborist = JSON.stringify(arborist)
  res.set = null

  cookie.write(req, res, 'arborist', jsonArborist)

  req = httpMocks.createRequest({
    headers: {
      Cookie: res._getHeaders()['set-cookie'][0]
    }
  })
  var actualArborist = parseSafelyJSON(cookie.read(req, res, 'arborist'))
  t.deepEqual(actualArborist, expectedArborist, 'arborist cookie should be cut to the most recent key value')
  t.end()
})
