var async = require('async')

var _ = require('lodash')

var dateReportCache = require('./date-report-cache')

module.exports = function dateRangeReport ({ daysRange, targets, criteria }, cb) {
  async.map(daysRange, getDateNew, flatten(cb))

  function getDateNew (date, cb) {
    async.map(targets, function (target, cb) {
      return dateReportCache({ target, date, criteria }, cb)
    }, function (err, result) {
      if (err) return cb(err)
      var object = result.reduce((obj, item) => _.merge(obj, item), {})
      cb(null, object)
    })
  }

  function flatten (fn) {
    return function (err, res) {
      if (err) return fn(err)
      var response = res.reduce((acc, current) => {
        _.forEach(current, (v, k) => { acc[k] = (acc[k] || 0) + v })
        return acc
      }, {})
      cb(null, response)
    }
  }
}
