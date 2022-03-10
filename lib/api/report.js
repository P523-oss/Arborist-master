var ss = require('serialize-stream')
var _ = require('lodash')
var send = require('send-data/json')
var pump = require('pump')
var through2 = require('through2')

var Events = require('../models/events')
var getReportsWithCalculation = require('../report')
var CSVDefaultDimensions = require('../utils/csv-default-dimensions').dimensions

var propertiesToExclude = [
  'accept',
  'userAgent',
  'debtAmount',
  'timeResidence',
  'zipCode',
  'licenseState',
  'bankName',
  'military',
  'dob',
  'payFrequency',
  'loanPurpose',
  'creditScore',
  'requestId',
  'noExternalCalls',
  'originNoExternalRequests',
  'day',
  'geoCity',
  'geoCountry',
  'geoStateFull',
  'geoRegion',
  'stopgoSold',
  'dobDiff',
  'id',
  'url',
  'publishers',
  'advertiserId',
  'maxAcceptsPerDay',
  'modifiedAt',
  'name',
  'rateAmount',
  'vertical',
  'offer',
  'traffic',
  'modifiedBy',
  'rateType',
  'date',
  'eventId'
]

module.exports = {
  getReports,
  getRequestIdInfo,
  getReportsWithCalculation
}

function getReports (req, res, opts, cb) {
  var {
    date,
    dateStart,
    dateEnd,
    format,
    filterBy,
    filterValue,
    dimensions,
    isShorten
  } = opts.query
  dimensions = parseJSON(dimensions) || []

  if (date) dateStart = dateEnd = date

  if (!dateStart || !dateEnd) {
    return cb(new Error('dateStart and dateEnd required'))
  }

  format = format || 'json'
  if (format === 'csv') res.writeHead(200, { 'content-type': 'text/csv' })
  if (format === 'json') res.writeHead(200, { 'content-type': 'application/json' })

  pump(
    Events.getDateRangeReport({ dateStart, dateEnd }),
    through2.obj(function (row, enc, cb) {
      if (filterBy === 'publisherId' && filterValue === row.publisher) {
        this.push(row)
      }
      if (filterBy === 'advertiserId' && filterValue === row.advertiserId) {
        this.push(row)
      }
      if (!filterBy && !filterValue) this.push(row)
      cb()
    }),
    through2.obj(function (row, enc, cb) {
      if (!isShorten) {
        this.push(row)
        return cb()
      }

      this.push(_.omit(row, propertiesToExclude))
      cb()
    }),
    ss(format, getSSOpts(format, dimensions)),
    res
  )
}

function getRequestIdInfo (req, res, opts, cb) {
  var id = decodeURIComponent(opts.params.id)

  Events.getRequestIdInfo(id, function (err, parsed) {
    if (err) return cb(err)

    var target = parsed.target
    var criteria = parsed.criteria

    send(req, res, { ...target, ...criteria, populatedUrl: parsed.targetUrl })
  })
}

function getSSOpts (format, dimensions) {
  var opts = { flatten: true }
  var newDimensions = CSVDefaultDimensions
  if (dimensions) newDimensions = _.union(CSVDefaultDimensions, dimensions)

  if (format === 'csv') opts.headers = newDimensions

  return opts
}

function parseJSON (data) {
  try {
    return JSON.parse(data)
  } catch (ex) {
    return undefined
  }
}
