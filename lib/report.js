var draSafe = require('date-range-array')
var pump = require('pump')
var ss = require('serialize-stream')
var through = require('through2').obj
var async = require('async')
var pk = require('pathkey')()
var _ = require('lodash')

var event = require('./models/events')
var getRevenue = require('./external-requests/revenue')

var limit = 8

module.exports = function (req, res, opts, cb) {
  var { date, dateStart, dateEnd, dimensions } = opts.query
  dimensions = parseJSON(dimensions) || []
  if (date) dateStart = dateEnd = date
  if (!dateStart || !dateEnd) return cb(new Error('dateStart and dateEnd or date required'))

  try {
    draSafe(dateStart, dateEnd)
  } catch (e) {
    return cb(e)
  }

  pump(
    event.getDateRangeReport({ dateStart, dateEnd }),
    reduceStream(addStandardDimensions(dimensions)),
    ss('json'),
    res,
    cb)
}

function addStandardDimensions (dimensions) {
  var revenueDimensions = ['targetId', 'date', 'targetEndpoint', 'origin']
  return _.union(revenueDimensions, dimensions)
}

function reduceStream (dimensions) {
  var report = {}

  return through(onData, flush)

  function onData (chunk, enc, cb) {
    chunk.level = dimensions.join('-')
    var key = pk.create(chunk)

    report[key] =
      report[key] ||
      Object.assign(
        {
          acceptances: 0,
          rejections: 0,
          requests: 0,
          visits: 0
        },
        pk.parse(key)
      )

    if (chunk.type === 'accept') {
      report[key].acceptances += 1
    }
    if (chunk.type === 'reject') {
      report[key].rejections += 1
    }
    if (chunk.type === 'visit') {
      report[key].visits += 1
    }
    report[key].requests = (report[key].acceptances || 0) + (report[key].rejections || 0)
    report[key].cost = chunk.type === 'accept'
      ? Number(chunk.tier || 0) + Number(report[key].cost || 0)
      : report[key].cost

    cb()
  }

  function flush (cb) {
    var self = this

    async.eachLimit(Object.values(report), limit, (r, cb) => {
      var dateOrigin = r.date
      var origin = r.origin
      var endpoint = r.targetEndpoint
      if (_.isUndefined(origin) || !r.acceptances) {
        self.push(r)
        return cb()
      }
      var revOpts = {
        daysRange: [dateOrigin],
        origin,
        endpoint
      }

      getRevenue(revOpts, (err, response) => {
        if (err) return cb(err)
        if (response.length !== 0) {
          r.revenue = response.reduce((revenue, event) => {
            return _.get(event, 'revenue.usd') + revenue
          }, 0)
        }

        self.push(r)
        cb()
      })
    }, cb)
  }
}

function parseJSON (data) {
  try {
    return JSON.parse(data)
  } catch (ex) {
    return undefined
  }
}
