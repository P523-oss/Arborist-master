var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')

var Origins = require('../../lib/models/origins')
var Publishers = require('../../lib/models/publisher')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should list origins', function (t) {
  var url = '/api/origins'
  var val1 = {
    id: '12442',
    name: 'origin1'
  }

  var val2 = { id: 'origin2', name: 'origin1', tiers: ['0.4'] }

  Origins.put(val1, function (err) {
    t.falsy(err, 'should not error')
    Origins.put(val2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.length, 2, 'response length should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should get origin', function (t) {
  var val = {
    id: '12442',
    user_id: '111',
    industry: 'bob'
  }

  Origins.put(val, function (err, origin) {
    t.falsy(err, 'no error')
    var url = `/api/origins/${origin.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.industry, val.industry, 'rate type should match')
      t.true(!_.isUndefined(res.body.createdAt), 'createdAt should exist')
      t.true(!_.isUndefined(res.body.modifiedAt), 'modifiedAt should exist')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var val = { id: 'origin11', name: 'origin1', tiers: ['0.4'], publisherId: '124124' }
  var url = `/api/origins/${val.id}`
  var opts = { method: 'POST', encoding: 'json' }
  var publisher = {
    id: '124124',
    name: 'name12',
    tier: [
      '0.50',
      '0.51'
    ]
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      servertest(server(), url, opts, function onResponse (err, res) {
        t.falsy(err, 'no error')

        Origins.get(res.body.id, function (err, origin) {
          t.falsy(err, 'no error')
          t.truthy(!_.isUndefined(origin.modifiedAt), 'modifiedAt should exist')
          t.end()
        })
      }).end(JSON.stringify(res.body))
    }).end(JSON.stringify(val))
  })
})

test.serial.cb('should load publisher on', function (t) {
  var publisher = {
    id: '124124',
    name: 'name12',
    tier: [
      '0.50',
      '0.51'
    ]
  }
  var val = { id: 'origin11', name: 'origin1', tiers: ['0.4'], publisherId: publisher.id }

  var url = `/api/origins/${val.id}`
  var opts = { method: 'POST', encoding: 'json' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      var optsGet = { method: 'GET', encoding: 'json' }

      servertest(server(), url, optsGet, function onResponse (err, res) {
        t.falsy(err, 'no error')

        t.is(res.body.publisher.name, publisher.name, 'correct statusCode')
        t.deepEqual(res.body.publisher.tier, publisher.tier, 'correct statusCode')
        t.end()
      })
    }).end(JSON.stringify(val))
  })
})

test.serial.cb('save origin with provided publisherId', function (t) {
  var publisher = {
    id: '124124',
    name: 'name12',
    tier: [
      '0.50',
      '0.51'
    ]
  }
  var origin = { name: 'originname', publisherId: '124124', originPixel: 'origin,com' }

  var url = '/api/origins/'
  var opts = { method: 'POST', encoding: 'json' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      var optsGet = { method: 'GET', encoding: 'json' }

      url = `/api/origins/${res.body.id}`

      servertest(server(), url, optsGet, function onResponse (err, res) {
        t.falsy(err, 'no error')
        t.is(res.body.publisher.name, publisher.name, 'correct statusCode')
        t.deepEqual(res.body.publisher.tier, publisher.tier, 'correct statusCode')
        t.end()
      })
    }).end(JSON.stringify(origin))
  })
})

test.serial.cb('remove origin', function (t) {
  var origin = { name: 'originname', publisherId: '124124', originPixel: 'origin,com' }
  var publisher = {
    id: '124124',
    name: 'name12'
  }
  var url = '/api/origins/'
  var opts = { method: 'POST', encoding: 'json' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')

    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      var optsDelete = { method: 'DELETE', encoding: 'json' }
      var originId = res.body.id
      url = `/api/origins/${res.body.id}`

      servertest(server(), url, optsDelete, function onResponse (err, res) {
        t.falsy(err, 'no error')
        t.is(res.body.success, true, 'correct response')

        Origins.get(originId, function (err, origin) {
          t.falsy(err, 'no error')
          t.is(origin, undefined, 'be no origin by that id')

          Origins.list(function (err, origins) {
            t.falsy(err, 'no error')
            var origin = origins.find(origin => origin.id === originId)
            t.is(origin, undefined, 'origins should not contain an initial origin')
            Publishers.get(publisher.id, function (err, publisher) {
              t.falsy(err, 'no error')
              t.is(Object.keys(publisher.origins).length, 0, 'origins should be empty')
              t.end()
            })
          })
        })
      })
    }).end(JSON.stringify(origin))
  })
})

test.serial.cb('remove origin that does not exist', function (t) {
  var originId = 'randomId123'

  Origins.get(originId, function (err, origin) {
    t.falsy(err, 'no error')
    t.is(origin, undefined, 'origin does not exist')
    var optsDelete = { method: 'DELETE', encoding: 'json' }
    var url = `/api/origins/${originId}`
    var expected = {
      message: 'Origin doesn\'t exist',
      success: false
    }
    servertest(server(), url, optsDelete, function onResponse (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 404, 'correct status code')
      t.deepEqual(res.body, expected, 'correct response')
      t.end()
    })
  })
})
