var async = require('async')
var _ = require('lodash')

var checkJordan = require('./external-requests/jordan')
var geo = require('./external-requests/geo')
var checkNathan = require('./external-requests/nathan')
var checkLead = require('./external-requests/ratespecial')
var checkOLP = require('./external-requests/OLP')
var userUnique24h = require('./check-user-unique-24hours')
var prediction50 = require('./external-requests/prediction50')
var leadsmarket = require('./external-requests/leadsmarket')
var itMediaCheck = require('./external-requests/it-media-check')
var checkStopgo = require('./external-requests/stopgo')
var getDeviceFromUserAgent = require('./utils/get-device-from-user-agent')
var getDateDiff = require('./utils/date-difference')
var IpAddressLastSeen = require('./models/ip-address-last-accept')
var isIPV6 = require('./utils/isIPV6')

var days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

module.exports = function createCriteria (reqInfo, cb) {
  if (!_.isObject(reqInfo)) return cb(null, {})

  if (reqInfo.noExternalCalls || reqInfo.originNoExternalRequests) {
    return userUnique24h.get(reqInfo.ip, function (err, visitedTargets) {
      if (err) return cb(err)
      var criteria = getCriteria({ reqInfo, visitedTargets })
      return cb(null, criteria)
    })
  }
  async.parallel({
    ipInternalStats: (cb) => IpAddressLastSeen.get(reqInfo.ip, cb),
    responseNathan: (cb) => checkNathan({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
    jordan: (cb) => checkJordan({
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      origin: reqInfo.origin,
      requestId: reqInfo.requestId
    }, cb),
    ratespecial7: (cb) => checkLead({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
    itMediaCheck: (cb) => itMediaCheck({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
    olp: (cb) => checkOLP({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
    stopgo: (cb) => checkStopgo({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
    leadsmarket: (cb) => leadsmarket({
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      requestId: reqInfo.requestId
    }, cb),
    geoPredict: cb => async.waterfall(
      [cb => geo({ ip: reqInfo.ip, requestId: reqInfo.requestId }, cb),
        (geo, cb) => prediction50({ reqInfo, geo }, cb)], cb
    ),
    visitedTargets: (cb) => userUnique24h.get(reqInfo.ip, cb)
  }, function (err,
    {
      ipInternalStats,
      responseNathan,
      olp,
      visitedTargets,
      jordan,
      geoPredict,
      leadsmarket,
      stopgo,
      itMediaCheck,
      ratespecial7
    }) {
    if (err) return cb(err)
    var criteria = getCriteria({ reqInfo, visitedTargets })
    var geoStats = (geoPredict || {}).geoStats || {}
    if (ipInternalStats) criteria.lastAccept = getDateDiff(new Date(ipInternalStats))
    criteria.geoCity = geoStats.city
    criteria.geoCountry = geoStats.country
    criteria.geoPostal = geoStats.postal
    criteria.geoStateFull = geoStats.state
    criteria.geoState = geoStats.region
    criteria.geoRegion = geoStats.region
    if (jordan && !_.isUndefined(jordan.age)) {
      criteria.jordanAge = jordan.age
      criteria.jordanClickId = jordan.api_click_id
    }
    if (itMediaCheck) criteria.itMediaCheck = itMediaCheck
    criteria.ratespecial7 = ratespecial7
    criteria.prediction50 = (geoPredict || {}).prediction50
    criteria.neverAccepted = criteria.lastAccept === Infinity
    if (responseNathan) criteria = Object.assign({}, criteria, responseNathan)
    if (leadsmarket) criteria = Object.assign({}, criteria, leadsmarket)
    if (olp) criteria = Object.assign({}, criteria, olp)
    criteria.device = getDeviceFromUserAgent(reqInfo.userAgent) || 'desktop'
    if (stopgo) {
      criteria.stopgoAge = getStopgoAge((stopgo || {}).last_seen)
      criteria.stopgoSold = (stopgo || {}).sold
      criteria.stopgoPresent = (stopgo || {}).code === 'found'
    }
    criteria.isIPV6 = isIPV6(reqInfo.ip)
    if (criteria.dob) criteria.dobDiff = getYearDiff(new Date(criteria.dob))
    cb(null, criteria)
  })
}

function getCriteria ({ reqInfo, visitedTargets }) {
  var criteria = Object.assign({}, reqInfo)
  if ((reqInfo.tier || '')[0] === 'p') {
    criteria.tier = (parseInt(criteria.tier.slice(1), 36) / 100).toFixed(2)
  }
  if (reqInfo.income) {
    criteria.income = parseFloat(reqInfo.income)
  }
  if (reqInfo.creditScore) {
    criteria.creditScore = parseFloat(reqInfo.creditScore)
  }
  criteria.lastAccept = Infinity
  _.forEach(reqInfo, (value, property) => {
    if (!property.includes('nDaysLastSeenTarget:')) return
    criteria[property] = getDateDiff(new Date(reqInfo[property]))
  })
  visitedTargets.forEach((target) => {
    criteria[`uniqueDailyIP:${target.id}`] = false
  })
  var date = new Date()
  criteria.hour = date.getHours()
  criteria.timestamp = date.toISOString()
  criteria.day = days[date.getDay()]
  return criteria
}

function getStopgoAge (lastSeen) {
  if (!lastSeen) return Infinity
  return getDateDiff(new Date(lastSeen))
}

function getYearDiff (lastSeen) {
  var date1 = lastSeen.getTime()
  var date2 = Date.now()
  var timeDiff = new Date(Math.abs(date2 - date1))
  return Math.abs(timeDiff.getUTCFullYear() - 1970)
}
