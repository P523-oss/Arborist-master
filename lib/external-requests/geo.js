var jsonist = require('jsonist')

var STATES = states()

var geoHost = process.env.GEOMETER_HOST || 'http://geometer.adnet.vip'
var logError = require('../utils/log-error')

module.exports = function getGeo ({ ip, requestId }, cb) {
  if (process.env.NODE_ENV === 'test') return testGeo({ ip, requestId }, cb)

  var url = `${geoHost}/api/lookup?ip=${ip}&reqId=${requestId}`

  var t0 = Date.now()
  jsonist.get(url, function (err, geo) {
    console.log({
      externalAPI: 'Geometer',
      responseTime: Date.now() - t0
    })

    if (err) {
      err.message = 'GEO API: ' + err.message || err.code
      logError(err)
      return cb(null, {})
    }

    geo = geo || {}
    geo.city = geo.city || ''
    geo.continent = geo.continent || ''
    geo.country = geo.country || ''
    geo.postal = geo.postal || ''
    geo.region = geo.region || ''
    geo.accuracy_radius = geo.accuracy_radius || ''
    geo.latitude = geo.latitude || ''
    geo.longitude = geo.longitude || ''
    geo.metro_code = geo.metro_code || ''
    geo.time_zone = geo.time_zone || ''
    geo.ip = geo.ip || ''

    geo.state = STATES[geo.region] || geo.region

    cb(null, geo)
  })
}

function states () {
  return {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    DC: 'District Of Columbia',
    FL: 'Florida',
    GA: 'Georgia',
    GU: 'Guam',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MH: 'Marshall Islands',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PW: 'Palau',
    PA: 'Pennsylvania',
    PR: 'Puerto Rico',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VI: 'Virgin Islands',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming'
  }
}

function testGeo ({ ip, requestId }, cb) {
  console.log({
    externalAPI: 'Geometer'
  })
  var geo = {
    '146.79.254.10': {
      city: 'Seattle',
      continent: 'North America',
      country: 'US',
      countryName: 'United States',
      postal: '98115',
      regionName: 'Washington',
      region: 'WA',
      accuracy_radius: 20,
      latitude: 47.6859,
      longitude: -122.2994,
      metro_code: 819,
      time_zone: 'America/Los_Angeles',
      ip: '146.79.254.10'
    },
    '64.186.123.21': {
      city: 'Metlakatla',
      continent: 'North America',
      country: 'US',
      countryName: 'United States',
      postal: '99926',
      regionName: 'Alaska',
      region: 'AK',
      accuracy_radius: 200,
      latitude: 55.1221,
      longitude: -131.5744,
      metro_code: 747,
      time_zone: 'America/Metlakatla',
      ip: '64.186.123.21',
      state: 'Alaska'
    },
    '134.201.250.155': {
      city: 'Alhambra',
      continent: 'North America',
      country: 'US',
      countryName: 'United States',
      postal: '91801',
      regionName: 'California',
      region: 'CA',
      accuracy_radius: 50,
      latitude: 34.0915,
      longitude: -118.1307,
      metro_code: 803,
      time_zone: 'America/Los_Angeles',
      ip: '134.201.250.155',
      state: 'California'
    },
    '127.0.0.1': {
      ip: '127.0.0.1',
      city: 'City',
      continent: 'Continent',
      country: 'Country',
      postal: '91world',
      region: 'REGION',
      accuracy_radius: 12000,
      latitude: 0.0,
      longitude: 0.0,
      metro_code: 0,
      time_zone: 'Country/City',
      state: 'StateFull'
    }
  }[ip] || {
    ip: '127.0.0.1',
    city: '',
    continent: '',
    country: '',
    postal: '',
    region: '',
    accuracy_radius: '',
    latitude: '',
    longitude: '',
    metro_code: '',
    time_zone: '',
    state: ''
  }

  cb(null, geo)
}
