var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')
var async = require('async')

var RejectOriginSubid = require('../../lib/models/reject-origin-subid')
var server = require('../../lib/server')
var db = require('../../lib/db')
var Publishers = require('../../lib/models/publisher')
var Targets = require('../../lib/models/targets')

var origin = 'origin1'
var origin2 = 'origin2'
var subid = 'subid1'
var subid2 = 'subid2'
var originSubid1 = `${origin}:${subid}`
var originSubid2 = `${origin2}:${subid2}`
var object = {}
object[originSubid1] = true
object[originSubid2] = true
var publisherId = '124124'
var constPublisher = {
  id: publisherId
}

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should list origin-subid', function (t) {
  var url = '/api/reject-origin-subid-list'
  var val1 = {
    id: 'origin1',
    subids: ['subid1', 'subid2']
  }

  var val2 = {
    id: 'origin2',
    subids: ['subid3', 'subid4']
  }

  var originSubIds = [val1, val2]
  async.map(originSubIds, RejectOriginSubid.putOriginSubid, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'should not error')
      t.deepEqual(res.body, originSubIds, 'response length should match')
      t.end()
    })
  })
})

test.serial.cb('should get reject-origin-subid entity', function (t) {
  var val = {
    id: 'origin1',
    subids: ['subid1', 'subid2']
  }

  RejectOriginSubid.putOriginSubid(val, function (err, object) {
    t.falsy(err, 'no error')
    var url = `/api/reject-origin-subid-list/${object.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(res.body.subids, val.subids, 'subids should match')
      t.true(!_.isUndefined(res.body.createdAt), 'createdAt should exist')
      t.true(!_.isUndefined(res.body.modifiedAt), 'modifiedAt should exist')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var val = {
    id: 'origin1',
    subids: ['subid1', 'subid2']
  }
  var url = '/api/reject-origin-subid-list'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    RejectOriginSubid.getOriginSubid(res.body.id, function (err, object) {
      t.falsy(err, 'no error')
      t.true(!_.isUndefined(object.modifiedAt), 'modifiedAt should exist')
      t.deepEqual(object.subids, val.subids, 'modifiedAt should exist')
      t.end()
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('get empty response for the id that doesnt exist', function (t) {
  var url = '/api/reject-origin-subid-list/wer'
  var opts = { method: 'GET', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, {}, 'correct response')
    t.end()
  })
})

test.serial.cb('remove the entity by id', function (t) {
  var val = {
    id: origin,
    subids: [{ id: 'subid1' }, { id: 'subid2' }]
  }

  var url = '/api/reject-origin-subid-list'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    RejectOriginSubid.getOriginSubid(res.body.id, function (err, object) {
      t.falsy(err, 'no error')
      t.truthy(object, 'object should exist')

      var url = `/api/reject-origin-subid-list/${origin}`
      var opts = { method: 'DELETE', encoding: 'json' }
      servertest(server(), url, opts, function onResponse (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.deepEqual(res.body.message, 'success', 'correct response message')
        t.end()
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('return success if an entity doesn\'t exist on the delete endpoint', function (t) {
  var url = '/api/reject-origin-subid-list/325235'
  var opts = { method: 'DELETE', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body.message, 'success', 'correct response message')
    t.end()
  })
})

test.serial.cb('reject traffic when subid match wild card at the end', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var visitor = {
    ip: '64.186.123.21',
    tier: '0.5',
    publisher: constPublisher.id,
    origin,
    subid: `${subid}:123`
  }

  var object = {
    id: origin,
    subids: [{ id: `${subid}:*` }]
  }

  RejectOriginSubid.putOriginSubid(object, function (err) {
    t.falsy(err, 'should not error')

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        geoState: { $nin: [] }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'no error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('reject traffic when subid match wild card at the beginning', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var visitor = {
    ip: '64.186.123.21',
    tier: '0.5',
    publisher: constPublisher.id,
    origin,
    subid: `12:${subid}`
  }

  var object = {
    id: origin,
    subids: [{ id: `*${subid}` }]
  }

  RejectOriginSubid.putOriginSubid(object, function (err) {
    t.falsy(err, 'should not error')

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        geoState: { $nin: [] }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'no error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})
