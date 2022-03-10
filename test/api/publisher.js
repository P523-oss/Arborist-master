var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')

var Publishers = require('../../lib/models/publisher')
var Origins = require('../../lib/models/origins')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should list', function (t) {
  var url = '/api/publishers'
  var val1 = { id: 'pub11', name: 'pub1', tiers: ['0.4'] }
  var val2 = { id: 'pub2', name: 'pub1', tiers: ['0.4'] }

  var expected = [
    { id: 'pub11', name: 'pub1', tiers: ['0.4'] },
    { id: 'pub2', name: 'pub1', tiers: ['0.4'] }
  ]

  Publishers.put(val1, function (err) {
    t.falsy(err, 'should not error')
    Publishers.put(val2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')

        t.is(res.body[0].id, expected[0].id, 'id should match')
        t.is(res.body[1].id, expected[1].id, 'id should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should get publisher', function (t) {
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'] }
  Publishers.put(val, function (err, pub) {
    t.falsy(err, 'no error')
    var url = `/api/publishers/${pub.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(res.body, pub, 'tiers should match')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.is(pub.name, res.body.name, 'name should match')
      t.true(!_.isUndefined(res.body.createdAt), 'createdAt should exist')
      t.true(!_.isUndefined(res.body.modifiedAt), 'modifiedAt should exist')
      t.true(!_.isUndefined(res.body.modifiedBy), 'modifiedBy should exist')
      t.end()
    })
  }
})

test.serial.cb('should add access list to publisher', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com', 'user2@email.com', 'user3@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.deepEqual(pub.accessList, val.accessList, 'accessList should match')
      t.end()
    })
  }
})

test.serial.cb('should add access list to publisher after clearing whitespaces', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com ', ' user2@email.com', ' user3@email.com'] }
  var expected = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com', 'user2@email.com', 'user3@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.deepEqual(pub.accessList, expected.accessList, 'accessList should match')
      t.end()
    })
  }
})

test.serial.cb('should add access list to publisher after normalizing access list emails', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['User1@email.com', 'user2@EMAIL.com', 'AHMED@email.com'] }
  var expected = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com', 'user2@email.com', 'ahmed@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.deepEqual(pub.accessList, expected.accessList, 'accessList should match')
      t.end()
    })
  }
})

test.cb('should get error when adding invalid emails to access list of publisher', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1', 'user2'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'should get error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - invalid access list invalid email:user1', 'error match')
    t.end()
  }
})

test.cb('should get error when emails are duplicated', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com', 'user1@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - invalid access list duplicated email:user1@email.com', 'error match')
    t.end()
  }
})

test.serial.cb('should add owner to publisher', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1@email.com', 'user2@email.com', 'user3@email.com'], owner: 'user4@email.com' }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.is(pub.owner, val.owner, 'owner should match')
      t.end()
    })
  }
})

test.cb('should not add invalid owner to publisher', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'user' }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - invalid owner email', 'error match')
    t.end()
  }
})

test.cb('should not add duplicated owner and accessList to publisher', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'user@email.com', accessList: ['user@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - invalid access list email duplicated with owner:user@email.com', 'error match')
    t.end()
  }
})

test.serial.cb('should add owner to publisher after clearing whitespaces', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'user1@email.com ' }
  var expected = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'user1@email.com' }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.deepEqual(pub.owner, expected.owner, 'accessList should match')
      t.end()
    })
  }
})

test.serial.cb('should add owner to publisher after normalizing owner email', function (t) {
  var url = '/api/publishers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'USER1@email.com' }
  var expected = { id: 'pub11', name: 'pub1', tiers: ['0.4'], owner: 'user1@email.com' }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Publishers.get(res.body.id, function (err, pub) {
      t.falsy(err, 'no error')
      t.deepEqual(pub.owner, expected.owner, 'accessList should match')
      t.end()
    })
  }
})

test.serial.cb('should get accessList within publisher', function (t) {
  var val = { id: 'pub11', name: 'pub1', tiers: ['0.4'], accessList: ['user1', 'user2', 'user3'] }

  Publishers.put(val, function (err) {
    t.falsy(err, 'should not error')
    var url = `/api/publishers/${val.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'should not error')
      t.true(!_.isUndefined(res.body.accessList), 'accessList should exist')
      t.deepEqual(res.body.accessList, val.accessList, 'accessList should match')
      t.end()
    })
  })
})

test.serial.cb('save origins when save publisher', function (t) {
  var val = {
    id: 'pub11',
    name: 'pub1',
    origins: {
      v503ncs: {
        vertical: 'jobs',
        noExternalRequests: true,
        name: 'erer',
        originPixel: 'ewr.com',
        id: 'v503ncs'
      }
    }
  }

  var url = '/api/publishers'
  servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
    t.falsy(err, 'should not error')
    Origins.get('v503ncs', function (err, origin) {
      t.falsy(err, 'should not error')
      t.is(origin.publisherId, 'pub11', 'publisher id should be saved')
      t.end()
    })
  })
    .end(JSON.stringify(val))
})
