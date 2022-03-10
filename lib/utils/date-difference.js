module.exports = function getDateDiff (lastTimeSeen) {
  var date1 = lastTimeSeen.getTime()
  var date2 = Date.now()
  var timeDiff = Math.abs(date2 - date1)
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
}
