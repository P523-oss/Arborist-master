var Targets = require('./models/targets')
var { getTargetPublisherTierKey } = Targets
module.exports = process.env.NODE_ENV === 'test' ? testDateReportCache : dateReportCacheCondition

function dateReportCacheCondition ({ target, date, criteria }, cb) {
  var targetId = target.id
  var tier = (criteria || {}).tier || ''
  var publisher = (criteria || {}).publisher || ''

  Targets.getTrafficTargetTierPublisher({ date, targetId, tier, publisher }, function (err, newImpressions = 0) {
    if (err) return cb(err)
    cb(null, {
      [getTargetPublisherTierKey(date, targetId, publisher, tier)]: newImpressions
    })
  })
}

function testDateReportCache ({ target, date, criteria }, cb) {
  const res1 = { '44215_oppo_uu': 4, '44215_44330_yy': 5, '44215_44330_UUU': 9 }
  const res2 = { '44215_oppo_uu': 2, '44215_44330_yy': 3, '44215_44330_UUU': 3 }
  if (date === '2018-01-23') return cb(null, res1)
  if (date === '2018-01-24') return cb(null, res2)
  return dateReportCacheCondition({ target, date, criteria }, cb)
}
