var test = require('ava')
var servertest = require('servertest')
var tk = require('timekeeper')

var TargetRateHistory = require('../../lib/models/target-rate-history')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should put targetId history', function (t) {
  tk.freeze(new Date('2018-02-11'))

  var object = { targetId: '22', rateAmount: 0.2, rateType: 'impression', date: '2018-02-11' }
  var url = '/api/target-rate-history'

  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(object))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    TargetRateHistory.get(object, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.rateType, object.rateType, 'param should match')
      t.is(res.targetId, object.targetId, 'param should match')
      t.end()
    })
  }
})

test.serial.cb('should get right data by date', function (t) {
  var object = { targetId: '22', rateAmount: 0.5, rateType: 'impression' }
  tk.freeze(new Date('2018-02-14T01:14:00'))

  var url = '/api/target-rate-history'

  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err) {
    t.falsy(err, 'no error')
    object.rateAmount = 0.9
    tk.freeze(new Date('2018-02-14T03:14:00'))

    servertest(server(), url, opts, function onResponse (err) {
      t.falsy(err, 'should not error')
      tk.freeze(new Date('2018-02-18'))
      object.rateAmount = 1.9

      servertest(server(), url, opts, function onResponse (err) {
        t.falsy(err, 'should not error')
        opts = { method: 'GET', encoding: 'json' }
        var date = '2018-02-15'
        var urlGet = `/api/target-rate-history?targetId=22&date=${date}`
        servertest(server(), urlGet, opts, function onResponse (err, res) {
          t.falsy(err, 'should not error')
          var response = res.body
          t.is(response.rateAmount, 0.9, 'rateAmount should match')

          t.end()
        })
      })
        .end(JSON.stringify(object))
    })
      .end(JSON.stringify(object))
  })
    .end(JSON.stringify(object))
})
