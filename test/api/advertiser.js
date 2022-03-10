var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')

var Advertisers = require('../../lib/models/advertisers')
var Targets = require('../../lib/models/targets')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.serial.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('admin should get a list of all stored advertisers', function (t) {
  var url = '/api/advertisers'
  var val1 = {
    id: '12442',
    name: 'advertiser1'
  }

  var val2 = { id: 'ad2', name: 'ad1', tiers: ['0.4'] }

  Advertisers.put(val1, function (err) {
    t.falsy(err, 'should not error')
    Advertisers.put(val2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.length, 2, 'response length should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should get advertiser', function (t) {
  var val = {
    id: '12442',
    rateType: 'rate23'
  }

  Advertisers.put(val, function (err, adv) {
    t.falsy(err, 'no error')
    var url = `/api/advertisers/${adv.id}`
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
  var url = '/api/advertisers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'ad11', name: 'ad1', tiers: ['0.4'] }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    servertest(server(), url, opts, function onResponse (err, res) {
      t.falsy(err, 'no error')

      Advertisers.get(res.body.id, function (err, ad) {
        t.falsy(err, 'no error')
        t.true(!_.isUndefined(ad.modifiedAt), 'modifiedAt should exist')
        t.end()
      })
    }).end(JSON.stringify(res.body))
  }).end(JSON.stringify(val))
})

test.serial.cb('should add access list to advertiser', function (t) {
  var url = '/api/advertisers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'ad1', accessList: ['user1@email.com', 'user2@email.com', 'user3@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    Advertisers.get(res.body.id, function (err, ad) {
      t.falsy(err, 'no error')
      t.deepEqual(ad.accessList, val.accessList, 'accessList should match')
      t.end()
    })
  }
})

test.cb('should get error when adding invalid emails to advertiser`s access list', function (t) {
  var url = '/api/advertisers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'adds1', accessList: ['user1', 'user2'] }
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
  var url = '/api/advertisers'
  var opts = { method: 'POST', encoding: 'json' }
  var val = { id: 'ad2222', accessList: ['user1@email.com', 'user1@email.com'] }
  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(val))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - invalid access list duplicated email:user1@email.com', 'error match')
    t.end()
  }
})

test.serial.cb('should get accessList within advertiser', function (t) {
  var val = { id: 'adddd', accessList: ['user1', 'user2', 'user3'] }

  Advertisers.put(val, function (err) {
    t.falsy(err, 'should not error')
    var url = `/api/advertisers/${val.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'should not error')
      t.true(!_.isUndefined(res.body.accessList), 'accessList should exist')
      t.deepEqual(res.body.accessList, val.accessList, 'accessList should match')
      t.end()
    })
  })
})

test.serial.cb('advertiser`s targets should be up to date if target change', function (t) {
  var target = {
    id: '7g03kai',
    endpoint: 'arborist',
    rateAmount: 10,
    rateType: 'impressions',
    accept: { origin: { $in: ['0703jdl'] } }
  }
  var advertiser = {
    id: 'adv1',
    typId: 'propper',
    targets: [target]
  }

  var opts = { method: 'GET', encoding: 'json' }

  Targets.put(target, function (err) {
    t.falsy(err, 'should not error')
    Advertisers.put(advertiser, function (err) {
      t.falsy(err, 'should not error')
      target.rateAmount = 20
      Targets.put(target, function (err) {
        t.falsy(err, 'should not error')
        var url = `/api/advertisers/${advertiser.id}`
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          var updatedTarget = res.body.targets[0]
          t.is(updatedTarget.rateAmount, target.rateAmount, 'match rateAmount')
          t.end()
        })
      })
    })
  })
})

test.serial.cb('authorized advertiser should get a list of advertisers he has access to', function (t) {
  var advertiser1 = { id: 'ad1', accessList: ['user1@mail.ru', 'user2@mail.ru'] }
  var advertiser2 = { id: 'ad2', accessList: ['user1@mail.ru', 'user3@mail.ru'] }
  var advertiser3 = { id: 'ad3', accessList: ['user4@mail.ru', 'user5@mail.ru'] }

  var userEmail = 'user1@mail.ru'
  var url = `/api/advertisers?authenticEmail=${userEmail}`
  var opts = { method: 'GET', encoding: 'json' }

  Advertisers.put(advertiser1, function (err) {
    t.falsy(err, 'should not error')
    Advertisers.put(advertiser2, function (err) {
      t.falsy(err, 'should not error')
      Advertisers.put(advertiser3, function (err) {
        t.falsy(err, 'should not error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          var adv1 = res.body[0]
          var adv2 = res.body[1]
          t.deepEqual(adv1.accessList, advertiser1.accessList, 'accessList should match')
          t.deepEqual(adv2.accessList, advertiser2.accessList, 'accessList should match')
          t.is(res.body.length, 2, 'the number of advertisers should match')
          t.end()
        })
      })
    })
  })
})

test.serial.cb('should store advertiserId property in its targets', function (t) {
  var url = '/api/advertisers'
  var opts = { method: 'POST', encoding: 'json' }
  var target1 = {
    id: 'tar1'
  }
  var target2 = {
    id: 'tar2'
  }
  var advertiser = { id: 'ad11', name: 'ad1', tiers: ['0.4'], targets: [target1, target2] }

  Targets.put(target1, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function onResponse (err, res) {
        t.falsy(err, 'should not error')
        Targets.get(target1.id, function (err, target) {
          t.falsy(err, 'should not error')
          t.is(target.advertiserId, advertiser.id, 'advertiser id should match')
          Targets.get(target2.id, function (err, target) {
            t.falsy(err, 'should not error')
            t.is(target.advertiserId, advertiser.id, 'advertiser id should match')
            t.end()
          })
        })
      }).end(JSON.stringify(advertiser))
    })
  })
})
