process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var tk = require('timekeeper')

var Targets = require('../lib/models/targets')
var Events = require('../lib/models/events')
var Publishers = require('../lib/models/publisher')
var Advertisers = require('../lib/models/advertisers')
var RuleSets = require('../lib/models/rule-set')
var Showm3LookupCache = require('../lib/models/showm3-lookup-cache')
var db = require('../lib/db')
var server = require('../lib/server')
var AdvertiserReport = require('../lib/models/advertiser-report')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should store and retrieve target', function (t) {
  var id = 'target-A'
  var target = { id, cat: 'hat' }

  Targets.put(target, function (err) {
    t.falsy(err, 'should not error')

    Targets.get(id, function (err, doc) {
      t.falsy(err, 'should not error')

      t.deepEqual(doc.cat, target.cat, 'should match')
      t.end()
    })
  })
})

test.serial.cb('should get targets with merged ruleset', function (t) {
  var ruleSet1 = {
    id: 'ruleSet1',
    name: 'Multi Target Ruleset',
    isAppliedToMultiTarget: true,
    accept: {
      day: {
        $in: ['1', '2', '3']
      },
      bankAccount: {
        $in: ['checking']
      }
    }
  }

  var target1 = {
    id: 'target1',
    accept: {
      origin: {
        $in: ['origin']
      },
      ruleId: {
        $in: ['ruleSet1']
      }
    }
  }

  RuleSets.put(ruleSet1, function (err, ruleSet) {
    t.falsy(err, 'should not error')
    Targets.put(target1, function (err, target) {
      t.falsy(err, 'should not error')
      var expected = [{
        id: 'target1',
        accept: {
          origin: {
            $in: ['origin']
          },
          day: {
            $in: ['1', '2', '3']
          },
          bankAccount: {
            $in: ['checking']
          }
        }
      }]

      Targets.listWithMergedRuleset(function (err, targets) {
        t.falsy(err, 'should not error')
        t.is(targets[0].id, expected[0].id, 'ids should match')
        t.deepEqual(targets[0].accept, expected[0].accept, 'accepts should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should not crash when multi target does not exist or ruleId is invalid',
  function (t) {
    var target1 = {
      id: 'target1',
      accept: {
        origin: {
          $in: ['origin']
        },
        ruleId: {
          $in: ['ruleSet1']
        }
      }
    }

    Targets.put(target1, function (err, target) {
      t.falsy(err, 'should not error')
      var expected = [{
        id: 'target1',
        accept: {
          origin: {
            $in: ['origin']
          }
        }
      }]

      Targets.listWithMergedRuleset(function (err, targets) {
        t.falsy(err, 'should not error')
        t.is(targets[0].id, expected[0].id, 'ids should match')
        t.deepEqual(targets[0].accept, expected[0].accept, 'accepts should match')
        t.end()
      })
    })
  })

test.cb('should store event', function (t) {
  var event = {
    criteria: {
      hour: 12,
      geoState: 'ca'
    }
  }

  Events.put(event, function (err) {
    t.falsy(err, 'should not error')
    t.end()
  })
})

test.serial.cb('should store and retrieve a publisher', function (t) {
  var id = '124124'
  var publisher = {
    id,
    name: 'name12',
    tier: [
      '0.50',
      '0.51'
    ]
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')

    Publishers.get(id, function (err, pub) {
      t.falsy(err, 'should not error')
      t.deepEqual(publisher, pub, 'should match')
      t.end()
    })
  })
})

test.serial.cb('should retrieve publishers', function (t) {
  var id = '11'
  var publisher = {
    id,
    name: 'name12',
    tier: [
      '0.50',
      '0.51'
    ]
  }
  var publisher2 = { id: '12323', name: 'hat2' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')

    Publishers.put(publisher2, function (err) {
      t.falsy(err, 'should not error')

      Publishers.list(function (err, list) {
        t.falsy(err, 'should not error')
        t.is(list.length, 2, 'should match')
        t.deepEqual(list, [publisher, publisher2], 'lists match')
        t.end()
      })
    })
  })
})

test.serial.cb('should store events count in Redis for target-origin-subid', function (t) {
  var date = '2018-09-01'
  tk.freeze(new Date(date))

  var target1 = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    advertiserId: 'ad1',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var target2 = {
    id: 'tar2-1',
    rateType: 'accept',
    url: 'https://doma.com/',
    rateAmount: 10,
    advertiserId: 'ad1',
    accept: {
      origin: { $in: ['or2'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var advertiser = {
    id: 'ad1',
    targets: [target1, target2]
  }

  var visitor1 = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    origin: 'or1',
    subid: 'sub1',
    tier: '0.50'
  }

  var visitor2 = {
    ip: '64.186.123.01',
    publisher: 'pub1',
    origin: 'or2',
    subid: 'sub2',
    tier: '0.50'
  }

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target1, function (err) {
      t.falsy(err, 'should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'should not error')
        Advertisers.put(advertiser, function (err) {
          t.falsy(err, 'should not error')
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.decision, 'accept', 'match decision')
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              t.is(res.body.decision, 'accept', 'match decision')
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                t.is(res.body.decision, 'accept', 'match decision')
                Targets.getEventCount({ advertiserId: advertiser.id, date }, function (err, res) {
                  var field1 = `targetId/originId/subId/eventTypeÿ${target1.id}ÿ${visitor1.origin}ÿ${visitor1.subid}ÿaccept`
                  var field2 = `targetId/originId/subId/eventTypeÿ${target2.id}ÿ${visitor2.origin}ÿ${visitor2.subid}ÿaccept`
                  t.falsy(err, 'should not error')
                  t.is(res.hasOwnProperty(field1), true, 'it has the proper field') // eslint-disable-line
                  t.is(res.hasOwnProperty(field2), true, 'it has the proper field') // eslint-disable-line
                  t.is(res[field2], '2', 'number of events should match')
                  t.end()
                })
              }).end(JSON.stringify(visitor2))
            }).end(JSON.stringify(visitor2))
          }).end(JSON.stringify(visitor1))
        })
      })
    })
  })
})

test.serial.cb('should put and retrieve stats', function (t) {
  var date = '2018-09-01'
  tk.freeze(new Date(date))

  var target1 = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    advertiserId: 'ad1',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var target2 = {
    id: 'tar2-1',
    rateType: 'accept',
    url: 'https://doma.com/',
    rateAmount: 10,
    advertiserId: 'ad1',
    accept: {
      origin: { $in: ['or2'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var advertiser = {
    id: 'ad1',
    targets: [target1, target2]
  }

  var visitor1 = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    origin: 'or1',
    subid: 'sub1',
    tier: '0.50'
  }

  var visitor2 = {
    ip: '64.186.123.01',
    publisher: 'pub1',
    origin: 'or2',
    subid: 'sub2',
    tier: '0.50'
  }

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target1, function (err) {
      t.falsy(err, 'should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'should not error')
        Advertisers.put(advertiser, function (err) {
          t.falsy(err, 'should not error')
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.decision, 'accept', 'match decision')
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              t.is(res.body.decision, 'accept', 'match decision')
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                t.is(res.body.decision, 'accept', 'match decision')
                AdvertiserReport.store({ advertiserId: advertiser.id, date }, function (err, res) {
                  t.falsy(err, 'should not error')
                  AdvertiserReport.retrieve({ advertiserId: advertiser.id, date }, function (err, res) {
                    t.falsy(err, 'should not error')
                    t.is(res[0].targetId, advertiser.targets[0].id, 'target id should match')
                    t.is(res[0].revenue, 20, 'target revenue should match')
                    t.is(res[1].count, '2', 'count should match')
                    t.is(res[1].subId, 'sub2', 'subId should match')
                    t.end()
                  })
                })
              }).end(JSON.stringify(visitor2))
            }).end(JSON.stringify(visitor2))
          }).end(JSON.stringify(visitor1))
        })
      })
    })
  })
})

test.serial.cb('should include "offer" dimension in reports', function (t) {
  var date = '2018-09-01'
  tk.freeze(new Date(date))

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }

  var publisher = {
    id: 'pub1'
  }

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    advertiserId: 'ad1',
    offer: 'personal-loan',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var advertiser = {
    id: 'ad1',
    targets: [target]
  }

  var visitor = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    origin: 'or1',
    subid: 'sub1',
    tier: '0.50'
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'Should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'Should not error')

      Advertisers.put(advertiser, function (err) {
        t.falsy(err, 'Should not error')

        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'Should not error')
          t.is(res.body.decision, 'accept', 'match decision')

          AdvertiserReport.store({ advertiserId: advertiser.id, date }, function (err, res) {
            t.falsy(err, 'Should not error')
            AdvertiserReport.retrieve({ advertiserId: advertiser.id, date }, function (err, report) {
              t.falsy(err, 'Should not error')
              t.is(report[0].offer, target.offer, 'correct offer')
              t.end()
            })
          })
        }).end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('Should cache and retrieve showm3 lookups', function (t) {
  var longId = '3ab9a49350-df4b45aef1-b3724a213b-497e855ee7'
  var key = `showm3-lookup-cache:longId:${longId}`

  db.get(key, function (err, shortId) {
    t.falsy(err, 'Should not error')

    t.is(shortId, null, 'shortId should be null')
    Showm3LookupCache.get(longId, function (err, shortId) {
      t.falsy(err, 'Should not error')

      t.is(shortId, 1042, 'lookup should match')
      db.get(key, function (err, shortId) {
        t.falsy(err, 'Should not error')

        t.is(shortId, 1042, 'lookup should match')
        t.end()
      })
    })
  })
})
