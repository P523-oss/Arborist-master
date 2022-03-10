var test = require('ava')
var tk = require('timekeeper')

const getImpressions = require('../lib/impressions')
const Targets = require('../lib/models/targets')
var { getTargetPublisherTierKey } = Targets

test.cb('should return right target based on impression in day', function (t) {
  tk.freeze(new Date('2018-09-15'))

  var target = { id: 'target1' }
  var target2 = { id: 'target2' }
  getImpressions({ daysRange: ['2018-01-23', '2018-01-24'], targets: [target, target2] }, function (err, result) {
    t.falsy(err, 'should not error')
    t.is(result['44215_oppo_uu'], 6, 'key value should match')
    t.is(result['44215_44330_yy'], 8, 'key value should match')
    t.is(result['44215_44330_UUU'], 12, 'key value should match')
    t.end()
  })
})

test.cb('should return right target based on previous data', function (t) {
  tk.freeze(new Date('2019-03-01'))
  var target = { id: 'target1' }
  var target2 = { id: 'target2' }
  var criteria = { publisher: '22', tier: '33' }
  Targets.incrTrafficPublisher({ target, criteria }, function (err) {
    t.falsy(err, 'should not error')

    Targets.incrTrafficPublisher({ target, criteria }, function (err) {
      t.falsy(err, 'should not error')

      getImpressions({ daysRange: ['2019-03-01', '2019-03-02'], targets: [target, target2], criteria }, function (err, result) {
        t.falsy(err, 'should not error')
        var key = getTargetPublisherTierKey('2019-03-01', target.id, criteria.publisher, criteria.tier)
        t.is(Number(result[key]), 2, 'key value should match')
        t.end()
      })
    })
  })
})
