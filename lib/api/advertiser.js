var cuid = require('cuid')
var _ = require('lodash')
var body = require('body/json')
var send = require('send-data/json')
var async = require('async')
var dra = require('date-range-array')

var Advertisers = require('../models/advertisers')
var { formatOwnerAccessListEmail, validateOwnerAccessList } = require('../utils/accessListFunctions')
var getClickImpressionAdvertiser = require('../external-requests/getClickImpressionAdvertiser')
var TargetRateHistory = require('../models/target-rate-history')
var { linkTargetToAdvertiser } = require('../models/targets')

module.exports = {
  getAdvertiser,
  putAdvertiser,
  listAdvertisers,
  getClickImpression
}

function getAdvertiser (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)
  Advertisers.get(id, function (err, advertiser) {
    if (err) return cb(err)

    send(req, res, advertiser)
  })
}

function putAdvertiser (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')

  body(req, res, function (err, advertiser) {
    if (err) return cb(err)
    advertiser.modifiedBy = email
    advertiser.id = advertiser.id || cuid()

    var formattedAdvertiser = formatOwnerAccessListEmail(advertiser)
    var errEmail = validateOwnerAccessList(formattedAdvertiser)
    if (errEmail) return cb(errEmail)

    var targets = advertiser.targets || []

    async.each(
      targets.map(target => ({
        targetId: target.id,
        advertiserId: advertiser.id
      })),
      linkTargetToAdvertiser,
      function (err) {
        if (err) return cb(err)

        Advertisers.put(formattedAdvertiser, function (err) {
          if (err) return cb(err)

          send(req, res, formattedAdvertiser)
        })
      }
    )
  })
}

function listAdvertisers (req, res, opts, cb) {
  var email = _.get(opts, 'auth.email')
  Advertisers.list(function (err, list) {
    if (err) return cb(err)
    if (opts.isAdmin) return send(req, res, list)

    var filteredList = (list || []).filter(advertiser => (advertiser.accessList || []).includes(email))
    if (!filteredList.length) return cb(createAuthError('Unauthorized: ' + email))

    send(req, res, filteredList)
  })
}

function getClickImpression (req, res, opts, cb) {
  var { advertiserId, dateStart, dateEnd } = opts.query || {}
  Advertisers.get(advertiserId, function (err, advertiser) {
    if (err) return cb(err)
    if (!advertiser) return send(req, res, [])
    var origins = []
    var targets = advertiser.targets || []

    var endpoints = []
    var rateMap = {}
    targets.map(target => {
      var originRule = _.get(target, 'accept.origin')
      if (target.endpoint) {
        endpoints.push(target.endpoint)
        rateMap[target.endpoint] = {
          rateAmount: target.rateAmount,
          rateType: target.rateType
        }
      }
      if (originRule && originRule.$in) origins = origins.concat(originRule.$in)
      if (originRule && originRule.$eq) origins.push(originRule.$eq)
    })

    origins = origins.filter(origin => origin)
    var reports = []
    var daysRange = dra(dateStart, dateEnd)
    async.each(endpoints, function (endpoint, cb) {
      async.each(origins, function (origin, cb) {
        async.each(daysRange, (date, cb) => {
          getClickImpressionAdvertiser({ accountId: advertiser.typId, originId: origin, endpointId: endpoint, date }, function (err, response) {
            if (err) return cb(err)
            if (!response) return cb()
            TargetRateHistory.get({ origin, endpoint, date }, function (err, body) {
              if (err) return cb(err)
              response.revenue = getRevenueFromEndpoint(_.isEmpty(body) ? rateMap[endpoint] : body, response)

              reports.push(response)
              cb()
            })
          })
        }, function (err) {
          if (err) return cb(err)
          cb()
        })
      }, function (err) {
        if (err) return cb(err)
        cb()
      })
    }, function (err) {
      if (err) return cb(err)

      send(req, res, reports)
    })
  })
}

function getRevenueFromEndpoint (endpoint, report) {
  if (!endpoint) return 0
  var counts = report.clicksTotal || 0
  if (endpoint.rateType === 'impressions') counts = report.impressionsTotal
  return counts * endpoint.rateAmount
}

function createAuthError (msg) {
  var err = new Error(msg || 'Unauthorized')
  err.statusCode = 401
  return err
}
