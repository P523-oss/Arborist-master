var test = require('ava')
var tk = require('timekeeper')
var servertest = require('servertest')

const score = require('../lib/score')
const Events = require('../lib/models/events')
const Targets = require('../lib/models/targets')
const server = require('../lib/server')

test.serial.cb('should return right score', function (t) {
  const targets = [
    { rpi: 1, impressions: 10 },
    { rpi: 1, impressions: 4 },
    { rpi: 2, impressions: 0 },
    { rpi: 1, impressions: 3 },
    { rpi: 1, impressions: 2 },
    { rpi: 0, impressions: 1 },
    { rpi: 0, impressions: 0 }
  ]
  const expected = [
    { rpi: 2, impressions: 0, score: Infinity },
    { rpi: 0, impressions: 0, score: Infinity },
    { rpi: 0, impressions: 1, score: 12.238734153404081 },
    { rpi: 1, impressions: 2, score: 9.154091913011426 },
    { rpi: 1, impressions: 3, score: 7.566036458008114 },
    { rpi: 1, impressions: 4, score: 6.619367076702041 },
    { rpi: 1, impressions: 10, score: 4.370227560204949 }]
  const explore = 50
  score.scoreTargets({ targets, explore }, function (err, score) {
    t.falsy(err, 'should not error')
    t.deepEqual(score, expected, 'score should match')
    t.end()
  })
})

test.serial.cb('should increase boosted ad score', function (t) {
  const targets = [
    { rpi: 1, impressions: 10, id: '1' },
    { rpi: 1, impressions: 4, id: '2', boost: 3 },
    { rpi: 2, impressions: 0, id: '3' },
    { rpi: 1, impressions: 3, id: '4' },
    { rpi: 1, impressions: 2, id: '5' },
    { rpi: 0, impressions: 1, id: '6' },
    { rpi: 0, impressions: 0, id: '7' }
  ]
  const expected = [
    { rpi: 2, id: '3', impressions: 0, score: Infinity },
    { rpi: 0, id: '7', impressions: 0, score: Infinity },
    { rpi: 1, id: '2', impressions: 4, score: 19.858101230106122, boost: 3 },
    { rpi: 0, id: '6', impressions: 1, score: 12.238734153404081 },
    { rpi: 1, id: '5', impressions: 2, score: 9.154091913011426 },
    { rpi: 1, id: '4', impressions: 3, score: 7.566036458008114 },
    { rpi: 1, id: '1', impressions: 10, score: 4.370227560204949 }
  ]
  const explore = 50
  score.scoreTargets({ targets, explore }, function (err, score) {
    t.falsy(err, 'should not error')
    t.deepEqual(score, expected, 'score should match')
    t.end()
  })
})

test.serial.cb('count score for new impression counting', function (t) {
  tk.freeze(new Date('2019-02-14'))
  var target = { id: '111', endpoint: '22' }
  var target2 = { id: '222', endpoint: '1212' }
  var criteria = { origin: '333', ip: '12235235', tier: 'qwe', publisher: 'ddd' }
  var targets = [target, target2]
  Events.put({
    type: 'accept',
    ...(target && { targetId: target.id }),
    ...(target && { targetEndpoint: target.endpoint }),
    ...criteria
  }, function (err) {
    t.falsy(err, 'should not error')
    score.getTopTarget({ targets, criteria }, function (err) {
      t.falsy(err, 'should not error')
      tk.freeze(new Date('2019-02-23'))
      Targets.incrTrafficPublisher({ target: target2, criteria }, function (err) {
        t.falsy(err, 'should not error')
        Targets.incrTrafficPublisher({ target: target2, criteria }, function (err) {
          t.falsy(err, 'should not error')
          Targets.incrTrafficPublisher({ target: target2, criteria }, function (err) {
            t.falsy(err, 'should not error')
            tk.freeze(new Date('2019-02-24'))
            score.getTopTarget({ targets, criteria }, function (err, targetRes) {
              t.falsy(err, 'should not error')

              t.is(targetRes.id, target.id, 'targets should match')
              t.end()
            })
          })
        })
      })
    })
  })
})

test.serial.cb('score should not be null on redirect without tier and publisher', function (t) {
  var date = '2019-03-14'
  tk.freeze(new Date(date))
  var url = '/redirect?origin=1'
  var headers = { 'user-agent': 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  var tier = ''
  var publisher = ''
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err) {
      t.falsy(err, 'no error')

      Targets.getTrafficTargetTierPublisher({ date, targetId: 'target1', tier, publisher }, function (err, impressions) {
        t.falsy(err, 'no error')
        t.is(impressions, 1, 'impression`s count should match')
        t.end()
      })
    })
  })
})
