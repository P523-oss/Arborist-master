var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')

var RuleSets = require('../../lib/models/rule-set')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should list rule sets', function (t) {
  var url = '/api/rule-set'
  var val1 = {
    id: '12442',
    name: 'ruleset1'
  }

  var val2 = { id: 'rule2', name: 'rul1', tiers: ['0.4'] }

  RuleSets.put(val1, function (err) {
    t.falsy(err, 'should not error')
    RuleSets.put(val2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.length, 2, 'response length should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should get rule set', function (t) {
  var val = {
    id: '12442'
  }

  RuleSets.put(val, function (err, ruleSet) {
    t.falsy(err, 'no error')
    var url = `/api/rule-set/${ruleSet.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.rateType, val.rateType, 'rate type should match')
      t.true(!_.isUndefined(res.body.createdAt), 'createdAt should exist')
      t.true(!_.isUndefined(res.body.modifiedAt), 'modifiedAt should exist')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var url = '/api/rule-set'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'ruleSet11', name: 'ruleSet1', tiers: ['0.4'] }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')

      RuleSets.get(res.body.id, function (err, ruleSet) {
        t.falsy(err, 'no error')
        t.true(!_.isUndefined(ruleSet.modifiedAt), 'modifiedAt should exist')
        t.end()
      })
    }).end(JSON.stringify(res.body))
  }).end(JSON.stringify(val))
})
