var dra = require('date-range-array')
module.exports = function lastDays (x) {
  if (x === 0) return []
  var end = new Date()
  var start = new Date().setUTCDate(end.getUTCDate() - x + 1)
  end = end.toISOString().slice(0, 10)
  start = new Date(start).toISOString().slice(0, 10)
  return dra(start, end)
}
