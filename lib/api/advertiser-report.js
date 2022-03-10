var async = require('async')
var send = require('send-data/json')
var body = require('body/json')
var dra = require('date-range-array')
var _ = require('lodash')
var { isISO8601 } = require('validator')

var Advertisers = require('../models/advertisers')
var AdvertiserReport = require('../models/advertiser-report')

var env = process.env.NODE_ENV

var acceptedAdvertiserIds = env === 'test'
  ? ['acceptedAdvertiser']
  : ['247lendinggroup', 'cjvio0ov900cz19k9zclcyaxs']

var restrictedDateStartAdvertiserIds = env === 'test'
  ? { restrictedAdvertiser: '2020-10-11' }
  : {
    cjvimyvgr009n19k92fn9gma6: '2020-12-01',
    cjvio0ov900cz19k9zclcyaxs: '2020-12-01',
    '247lendinggroup': '2020-12-02'
  }

module.exports = {
  trigger,
  get
}

function trigger (req, res, opts, cb) {
  body(req, res, function (err, reqInfo) {
    if (err) return cb(err)

    var date = reqInfo.date || getYesterday()
    storeAdvertiserReports(date, function (err) {
      if (err) return cb(err)

      send(req, res, { success: true })
    })
  })
}

function get (req, res, opts, cb) {
  verifyAdvertiserAndGetReport(opts, function (err, stats) {
    if (err) return cb(err)

    var filteredStats = _.filter(_.flatten(stats), targetInfo => targetInfo)
    if (!acceptedAdvertiserIds.includes(opts.query.advertiserId)) {
      filteredStats.forEach(function (report) {
        report.subId = undefined
      })
    }
    filteredStats.forEach(function (report) {
      report.eventType = 'impression'
    })
    send(req, res, filteredStats)
  })
}

function storeAdvertiserReports (date, cb) {
  Advertisers.list(function (err, advertisers) {
    if (err) return cb(err)
    async.each(
      advertisers.map(advertiser => ({ advertiserId: advertiser.id, date })),
      AdvertiserReport.store,
      cb
    )
  })
}

function verifyAdvertiserAndGetReport (opts, cb) {
  var { advertiserId, dateStart, dateEnd } = opts.query || {}

  if (!advertiserId) return cb(new Error('advertiser id is required'))
  if (!dateStart || !dateEnd) return cb(new Error('dateStart and dateEnd required'))
  if (!isISO8601(dateStart) || !isISO8601(dateEnd)) {
    return cb(new Error('date is in the wrong format'))
  }
  if (dateStart > dateEnd) {
    return cb(new Error('dateStart is greater than dateEnd'))
  }
  if (opts.isAdmin) return getReport(opts, cb)

  Advertisers.get(advertiserId, function (err, advertiser) {
    if (err) return cb(err)
    if (!((advertiser || {}).accessList || []).includes(opts.auth.email)) {
      return cb(createAuthError('Unauthorized: ' + opts.auth.email))
    }

    getReport(opts, cb)
  })
}

function getReport (opts, cb) {
  var { advertiserId, dateStart, dateEnd } = opts.query || {}
  var restrictedDateStart = restrictedDateStartAdvertiserIds[advertiserId]
  if (restrictedDateStart && restrictedDateStart > dateStart) {
    dateStart = restrictedDateStart
  }
  if (dateStart > dateEnd) dateEnd = dateStart
  var daysRange = dra(dateStart, dateEnd)

  async.map(
    daysRange.map(date => ({ date, advertiserId })),
    AdvertiserReport.retrieve,
    cb
  )
}

function createAuthError (msg) {
  var err = new Error(msg || 'Unauthorized')
  err.statusCode = 401
  return err
}

function getYesterday () {
  var today = new Date()
  today.setDate(today.getDate() - 1)
  return today.toISOString().split('T')[0]
}
