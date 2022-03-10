var xtend = require('xtend')
var _ = require('lodash')
var async = require('async')
var redirect = require('redirecter')
var mustache = require('mustache')
var qs = require('querystring')
var send = require('send-data/json')
var URL = require('url')

var Targets = require('../models/targets')
var getIP = require('../utils/get-ip')
var cookie = require('../cookie')
var parseSafelyJSON = require('../utils/parse-json-safely')
var createCriteria = require('../create-criteria')
var Publishers = require('../models/publisher')
var Origins = require('../models/origins')
var score = require('../score')
var createEvent = require('../utils/create-event')
var filterTargets = require('../utils/filter-targets')
var visitPublisherPixel = require('../utils/visit-publisher-pixel')
var visitOriginPixel = require('../utils/visit-original-pixel')
var checkOriginSubidReject = require('../utils/checkOriginSubidReject')
var userUnique24h = require('../check-user-unique-24hours')
var recordVisit = require('../record-visit')
var Events = require('../models/events')
var IpAddressLastAccept = require('../models/ip-address-last-accept')
var getStoragePublicUrl = require('../utils/get-google-storage-url')
var Showm3LookupCache = require('../models/showm3-lookup-cache')
var log = require('../utils/log')

module.exports = {
  targetRedirect,
  showm3Redirect,
  visit,
  jsVisit,
  visitRevenue,
  recordPixelEvent
}

function targetRedirect (req, res, opts, cb) {
  getInformation({ req, res, opts }, function (err, info) {
    if (err) return cb(err)
    var { targets, criteria, publisher, arborist, origin, originSubidReject } = info || {}
    if (originSubidReject) return redirect(req, res, 'back')

    var publisherId = (publisher || {}).id
    if (publisherId) {
      criteria.publisher = publisherId
      criteria.publisherName = publisher.name
    }
    score.getTopTarget({
      targets: filterTargets(targets, criteria),
      criteria
    }, (err, target) => {
      if (err) return cb(err)
      var publisherId = (publisher || {}).id
      if (publisherId) {
        criteria.publisher = publisherId
        criteria.publisherName = publisher.name
      }
      recordTargetRedirect({ criteria, target, id: req.id }, function (err) {
        if (err) return cb(err)

        if (!target) return redirect(req, res, 'back')
        arborist[`nDaysLastSeenTarget:${target.id}`] =
          new Date().toISOString().slice(0, 10)
        cookie.write(req, res, 'arborist', JSON.stringify(arborist))

        makeResponses({ req, res, publisher, criteria, target, origin })
      })
    })
  })
}

function showm3Redirect (req, res, opts, cb) {
  Showm3LookupCache.get(opts.query.id, function (err, shortId) {
    if (err) return cb(err)

    opts.query.typId = opts.query.id
    opts.query.origin = shortId || opts.query.id
    opts.query.subid = opts.query.affsub

    targetRedirect(req, res, opts, cb)
  })
}

function getInformation ({ req, res, opts }, cb) {
  var query = xtend(opts.query)
  query.requestId = req.id
  query.ip = getIP(req)
  var arborist = parseSafelyJSON(cookie.read(req, res, 'arborist')) || {}
  var t0 = Date.now()
  query = _.merge(query, arborist)

  checkOriginSubidReject({ origin: query.origin, subid: query.subid }, function (err, originSubidReject) {
    if (err) return cb(err, {})
    Origins.get(query.origin, function (err, origin) {
      if (err) return cb(err)
      var arbitraryParams = (origin || {}).arbitraryParams || {}

      query.originNoExternalRequests = (origin && origin.noExternalRequests) || false
      query.userAgent = (req.headers || {})['user-agent']
      query.requestType = 'web'
      query.subid = query.affsub
      async.parallel({
        criteria: (cb) => createCriteria(query, cb),
        targets: cb => Targets.listWithMergedRuleset(cb),
        publisher: cb => Publishers.find(query, cb)
      }, function (err, { criteria, targets, publisher }) {
        if (err) return cb(err)
        criteria = _.assign({}, criteria, arbitraryParams)
        console.log({
          externalAPI: 'criteria',
          responseTime: Date.now() - t0
        })

        cb(err, { criteria, targets, publisher, arborist, origin, originSubidReject })
      })
    })
  })
}

function makeResponses ({ req, res, publisher, criteria, target, origin }) {
  try {
    visitPublisherPixel(publisher, criteria, target, req.id)
    visitOriginPixel(origin, criteria, target, req.id)

    var redirectParams = getUrlParams(target.adParams)
    var destParams = _.merge({}, criteria, target, { requestId: req.id })
    var dest = mustache.render(target.url, destParams)

    if (target && !target.preserveReferrer) dest = `/visit${redirectParams}#` + dest

    redirect(req, res, dest)
    if (target) IpAddressLastAccept.put(criteria.ip)
    userUnique24h.put({ ip: criteria.ip, target }, (err) => {
      if (err) return console.error(err)
    })
  } catch (err) {
    return console.error(err)
  }
}

function recordTargetRedirect ({ target, criteria, id }, cb) {
  log({ criteria, target, requestId: id })

  const event = createEvent(target, criteria)
  return async.parallel({
    eventResponse: (cb) => recordVisit({ criteria, target, id }, cb),
    eventAccept: (cb) => Events.put(event, cb),
    TargetEventCount: (cb) =>
      Targets.incrEventCount({
        targetId: (target || {}).id,
        originId: criteria.origin,
        subId: criteria.subid,
        eventType: 'visit'
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

function visit (req, res, opts, cb) {
  Targets.popTargetUrl(opts.params.requestId, function (err, response) {
    if (err) return cb(err)

    if (!response) {
      err = {}
      err.statusCode = 404
      return cb(err)
    }
    let targetUrl = response
    let target, criteria
    if (response.charAt(0) === '{') {
      var parsed = JSON.parse(response)
      parsed = typeof parsed === 'object' ? parsed : {}
      targetUrl = parsed.targetUrl
      target = parsed.target
      criteria = parsed.criteria
      if (criteria) {
        criteria.visitorIp = getIP(req)
        criteria.ipMatch = criteria.ip === criteria.visitorIp
      }
    }

    log({ requestId: req.id, location: targetUrl, url: req.url })
    if (target) {
      return recordVisit({ criteria, target, id: req.id }, function (err) {
        if (err) return cb(err)

        var parsedUrl = URL.parse(targetUrl, true) // eslint-disable-line
        var query = Object.assign({}, parsedUrl.query, (opts || {}).query)
        var requestId = opts.params.requestId
        var destination = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`
        destination += `?requestId=${requestId}`
        if (qs.stringify(query)) destination += `&${qs.stringify(query)}`
        try {
          redirect(req, res, { statusCode: 301, target: destination })
        } catch (err) {
          console.error({
            error: err,
            target: target,
            criteria: criteria,
            destination: destination
          })
          return cb(err)
        }
      })
    }
    try {
      redirect(req, res, { statusCode: 301, target: targetUrl })
    } catch (err) {
      console.error({
        error: err,
        target: target,
        criteria: criteria,
        destination: targetUrl
      })
      return cb(err)
    }
  })
}

function jsVisit (req, res, opts, cb) {
  var imageUrl
  var duration = (opts.query || {}).duration
  var text = (opts.query || {}).text
  var imageFileName = (opts.query || {}).filename
  if (imageFileName) imageUrl = getStoragePublicUrl(imageFileName)
  var imgTag = !_.isUndefined(imageUrl) ? `<img src="${imageUrl}" alt="${text}" style="width:50vh; height:50vh">` : ''
  var textDiv = !_.isUndefined(text) ? `<div style="position: absolute; top: 0; right: 0; left: 0; bottom: 0;"><h3 style="margin-top: 50vh">${text || ''}</h3></div>` : ''
  res.end(`<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="utf-8"></head><body style="text-align:center;">
      <div style="margin-top: 25vh">
      ${textDiv}
      ${imgTag}
      </div>
      <script>setTimeout(function () {
        var loc = window.location.hash.slice(1)
        window.location = loc ? loc : '/'
      }, ${duration || 0})
      </script></body></html>`)
}

function visitRevenue (req, res, opts, cb) {
  var { visitId, revenue } = opts.query || {}

  if (!visitId) {
    var responseBody = {
      error: 'visitId parameter required'
    }

    return send(req, res, { statusCode: 400, body: responseBody }, cb)
  }

  Targets.popVisitInfo(visitId, function (err, response) {
    if (err) return cb(err)

    if (!response) {
      var responseBody = {
        error: 'visitId missing or already used'
      }

      return send(req, res, { statusCode: 400, body: responseBody }, cb)
    }

    var target = response.target
    var criteria = response.criteria
    criteria.revenue = revenue

    recordVisitRevenue({ criteria, target, id: visitId }, function (err) {
      if (err) return cb(err)

      send(req, res, { message: 'ok' })
    })
  })
}

function recordVisitRevenue ({ target, criteria, id }, cb) {
  log({ criteria, target, requestId: id })
  return async.parallel({
    eventResponse: (cb) => Events.put({
      type: 'revenue',
      ...target,
      ...criteria
    }, cb)
  }, cb)
}

function recordPixelEvent (req, res, opts, cb) {
  var { requestId, eventType, price, interstitial } = opts.query || {}

  if (!requestId || !eventType) {
    return recordBadEventAndSendError(
      {
        requestId,
        eventType,
        price,
        interstitial,
        req,
        res,
        errorMessage: 'requestId and eventType parameters are required'
      }
      , cb)
  }

  if (!doesEventTypeExist(eventType)) {
    return recordBadEventAndSendError(
      {
        requestId,
        eventType,
        price,
        interstitial,
        req,
        res,
        errorMessage: 'eventType is not in the list'
      }
      , cb)
  }

  Targets.popEventInfo({ requestId, eventType }, function (err, response) {
    if (err) return cb(err)

    if (!response) {
      return recordBadEventAndSendError(
        {
          requestId,
          eventType,
          price,
          interstitial,
          req,
          res,
          errorMessage: 'requestId missing or already used'
        }
        , cb)
    }

    var target = response.target
    var criteria = response.criteria
    criteria.timestamp = new Date().toISOString()
    criteria.interstitial = interstitial
    recordEvent({ criteria, target, requestId, type: eventType, price },
      function (err) {
        if (err) return cb(err)

        send(req, res, { message: 'ok' })
      })
  })
}

function recordEvent ({ target, criteria, requestId, type, price }, cb) {
  log({ criteria, target, requestId, type, price })
  return Events.put({ type, price, ...target, ...criteria }, cb)
}

function recordBadEventAndSendError ({ requestId, eventType, price, interstitial, req, res, errorMessage }, cb) {
  var criteria = {}
  criteria.timestamp = new Date().toISOString()
  criteria.interstitial = interstitial
  criteria.requestId = requestId
  recordEvent({ criteria, target: {}, requestId, type: eventType, price },
    function (err) {
      if (err) return cb(err)

      var responseBody = {
        error: errorMessage
      }
      return send(req, res, { statusCode: 400, body: responseBody }, cb)
    })
}

function getUrlParams (adParams) {
  if (_.isUndefined(adParams)) return ''
  var result = []
  Object.keys(adParams).map(key => {
    result.push(encodeURIComponent(key) + '=' + encodeURIComponent(adParams[key]))
  })

  return `?${result.join('&')}`
}

function doesEventTypeExist (eventType) {
  var eventTypesList = [
    'initiateInter',
    'initiateApplication',
    'lead',
    'initiateCreditUpsell',
    'YESsecurity',
    'NOsecurity',
    'HITback',
    'leadSold',
    'adverse',
    'AUTO',
    'CM'
  ]
  return _.includes(eventTypesList, eventType)
}
