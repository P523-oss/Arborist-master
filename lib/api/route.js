var async = require('async')
var _ = require('lodash')
var xml2js = require('xml2js')

var containsNecessaryParams = require('../utils/contain-necessary-params')
var score = require('../score')
var filterTargets = require('../utils/filter-targets')
var userUnique24h = require('../check-user-unique-24hours')
var visitPublisherPixel = require('../utils/visit-publisher-pixel')
var visitOriginPixel = require('../utils/visit-original-pixel')
var config = require('../../config')
var getParser = require('../utils/get-parser')
var createCriteria = require('../create-criteria')
var createEvent = require('../utils/create-event')
var Targets = require('../models/targets')
var Publishers = require('../models/publisher')
var Origins = require('../models/origins')
var Events = require('../models/events')
var IpAddressLastAccept = require('../models/ip-address-last-accept')

var xmlBuilder = new xml2js.Builder({ rootName: 'response' })
var getSender = require('../utils/get-sender')
var checkOriginSubidReject = require('../utils/checkOriginSubidReject')
var log = require('../utils/log')

module.exports = {
  decide
}

function decide (req, res, opts, cb) {
  var { output = 'json' } = opts.query

  getInformation(req, res, function (err, { criteria, targets, publisher, ip, origin, originSubidReject }) {
    if (err) return cb(err)

    if (originSubidReject) return decideResponse({ req, res, target: null, output })
    if (!containsNecessaryParams({ criteria, publisher, ip })) return request400({ req, res, output }, cb)

    score.getTopTarget({
      targets: filterTargets(targets, criteria),
      criteria
    }, (err, target) => {
      if (err) return cb(err)

      req.isAccept = !!target
      async.parallel({
        target: (cb) => userUnique24h.put({ ip, target }, cb),
        record: (cb) => recordDecision({ criteria, target, id: req.id, publisher }, cb)
      }, function (err) {
        if (err) return cb(err)

        if (target) visitPublisherPixel(publisher, criteria, target, req.id)
        if (target && origin) visitOriginPixel(origin, criteria, target, req.id)
        if (target) IpAddressLastAccept.put(ip)
        decideResponse({ req, res, target, output })
      })
    })
  })
}

function getInformation (req, res, cb) {
  var t0 = Date.now()
  var parser = getParser(req)
  parser(req, res, function (err, reqInfo) {
    if (err) return cb(err, {})
    reqInfo.requestId = req.id
    checkOriginSubidReject({ origin: reqInfo.origin, subid: reqInfo.subid }, function (err, originSubidReject) {
      if (err) return cb(err, {})
      if (originSubidReject) return cb(null, { originSubidReject })

      Origins.get(reqInfo.origin, function (err, origin) {
        if (err) return cb(err, {})
        var arbitraryParams = (origin || {}).arbitraryParams || {}
        reqInfo.noExternalCalls = false
        reqInfo.originNoExternalRequests = false
        reqInfo.requestType = 'ping tree'
        async.parallel({
          criteria: (cb) => createCriteria(reqInfo, cb),
          targets: Targets.listWithMergedRuleset,
          publisher: cb => Publishers.get(reqInfo.publisher, cb)
        }, function (err, ct) {
          console.log({
            externalAPI: 'criteria',
            responseTime: Date.now() - t0
          })
          ct.ip = reqInfo.ip
          ct.criteria = _.assign({}, ct.criteria, arbitraryParams)
          if (origin) ct.origin = origin
          cb(err, ct)
        })
      })
    })
  })
}

function recordDecision ({ target, criteria, id, publisher }, cb) {
  log({ criteria, target, requestId: id })
  const event = createEvent(target, criteria, publisher)
  return async.parallel({
    eventResponse: (cb) => Events.put(event, cb),
    TargetEventCount: (cb) =>
      Targets.incrEventCount({
        targetId: (target || {}).id,
        originId: criteria.origin,
        subId: criteria.subid,
        eventType: 'accept'
      }, cb),
    ...(target && { traffic: (cb) => Targets.incrTraffic(target.id, cb) }),
    ...(target && { trafficPublishers: (cb) => Targets.incrTrafficPublisher({ target, criteria }, cb) })
  }, function (err) {
    if (err) return cb(err)

    Targets.putTargetUrl({
      id,
      target,
      criteria: _.merge({}, criteria, target, { requestId: id })
    }, cb)
  })
}

function decideResponse ({ req, res, target, output }) {
  var url = `${config.domain}/visit/${req.id}`

  if (target && !target.preserveReferrer) url = `${config.domain}/visit#` + url

  var responseBody = target
    ? { decision: 'accept', url: url }
    : { decision: 'reject' }
  if (output === 'xml') {
    responseBody = xmlBuilder.buildObject(responseBody)
    res.setHeader('Content-Type', 'text/xml')
  }
  var sender = getSender(output)
  sender(req, res, responseBody)
}

function request400 ({ req, res, output }, cb) {
  var responseBody = {
    error: 'Bad Request - does not contain IP, publisher, or tier'
  }
  if (output === 'xml') {
    responseBody = xmlBuilder.buildObject(responseBody)
    res.setHeader('Content-Type', 'text/xml')
  }

  var sender = getSender(output)

  sender(req, res, { statusCode: 400, body: responseBody }, cb)
}
