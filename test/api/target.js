var test = require('ava')
var servertest = require('servertest')
var tk = require('timekeeper')
var _ = require('lodash')

var server = require('../../lib/server')
var Targets = require('../../lib/models/targets')
var TargetRateHistory = require('../../lib/models/target-rate-history')
var db = require('../../lib/db')

var targetFactory = ({ targetId, name, url, endpoint, rateType, rateAmount, rules, advertiserId, oldTargetId, publishers }) =>
  ({
    id: targetId || 'obkp21',
    name: name || 'ponchoman',
    url: url || 'http://pfpl.ru',
    publishers: publishers || [],
    endpoint: endpoint || 1956,
    rateType: rateType || 'accept',
    rateAmount: rateAmount || 0.9,
    accept: rules || {},
    advertiserId: advertiserId || 'guinness1759',
    oldTargetId: oldTargetId || null
  })

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.cb('not found', function (t) {
  var url = '/404'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 404, 'correct statusCode')
    t.is(res.body.error, 'Resource Not Found', 'error match')
    t.end()
  })
})

test.serial.cb('should get value', function (t) {
  var val = { id: 'test-key', some: 'test object' }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    var url = '/api/targets/test-key'
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.id, val.id, 'values should match')
      t.is(res.body.some, val.some, 'values should match')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'some-id', some: 'other test object' }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Targets.get('some-id', function (err, doc) {
      t.falsy(err, 'no error')

      t.is(doc.id, val.id, 'values should match')
      t.is(doc.some, val.some, 'values should match')
      t.is(doc.modifiedBy, 'test@interlincx.com', 'correct email')
      t.end()
    })
  }
})

test.serial.cb('should list targets', function (t) {
  var url = '/api/targets'

  var target1 = { id: 'some-id', some: 'other test object' }
  var target2 = { id: 'test-key', some: 'test object' }

  var expected = [
    target1,
    target2
  ]

  Targets.put(target1, function (err) {
    t.falsy(err, 'Should not error')

    Targets.put(target2, function (err) {
      t.falsy(err, 'Should not error')

      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')

        t.is(res.body[0].id, expected[0].id, 'response should match')
        t.is(res.body[0].some, expected[0].some, 'response should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should save rate history when params exist', function (t) {
  tk.freeze(new Date('2018-09-15'))

  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'target1', rateAmount: 12, rateType: 'impressions' }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    TargetRateHistory.get({ targetId: 'target1', date: '2018-09-18' }, function (err, body) {
      t.falsy(err, 'no error')
      t.is(body.rateAmount, 12, 'correct rateAmount')
      t.is(body.rateType, 'impressions', 'correct rateType')
      t.end()
    })
  }
})

test.serial.cb('should not save rate history when params doesnt exist', function (t) {
  tk.freeze(new Date('2018-09-15'))

  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'target1', rateType: 'impressions' }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    TargetRateHistory.get({ targetId: 'target1', date: '2018-09-18' }, function (err, body) {
      t.falsy(err, 'no error')
      t.true(_.isEmpty(body), 'object shouldnt exist')
      tk.reset()
      t.end()
    })
  }
})

test.serial.cb('should keep target history', function (t) {
  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var target = targetFactory({})
  var id = target.id

  servertest(server(), url, opts, function (err) {
    t.falsy(err, 'no error')
    target.endpoint = 11111
    servertest(server(), url, opts, onResponse)
      .end(JSON.stringify(target))
  })
    .end(JSON.stringify(target))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    opts = { method: 'GET', encoding: 'json' }
    url = `/api/targets-history/${id}`
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.body.length, 2, 'have correct length')
      t.end()
    })
  }
})

test.serial.cb('should not save target if target url is not valid', function (t) {
  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var target = targetFactory({
    url: 'https://path.money/?origin={{origin}}_{{endpoint}'
  })

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.body.error, 'target URL\'s brackets validation failed')
    t.end()
  })
    .end(JSON.stringify(target))
})

test.serial.cb('should not save target if checker for target url failed', function (t) {
  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }
  var target = targetFactory({
    url: 'path.money/?origin={{origin}}_{{endpoint}}'
  })

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.body.error, 'URL is not valid', 'match error string')
    t.end()
  })
    .end(JSON.stringify(target))
})
