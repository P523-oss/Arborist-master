var test = require('ava')
var tk = require('timekeeper')
var servertest = require('servertest')
var async = require('async')
var qs = require('querystring').stringify

var server = require('../../lib/server')
var Events = require('../../lib/models/events')
var Publishers = require('../../lib/models/publisher')
var Targets = require('../../lib/models/targets')
var db = require('../../lib/db')
var memdown = require('../../lib/multilevel')
var Advertisers = require('../../lib/models/advertisers')

var getOpts = { method: 'GET', encoding: 'json' }
const postOpts = { method: 'POST', encoding: 'json' }
var publisherId = '124124'
var constPublisher = {
  id: publisherId,
  origins: { origin1: { id: 'origin1' } }
}
const visitor = {
  ip: '64.186.123.21',
  publisher: publisherId,
  origin: 'origin1',
  tier: '0.50'
}

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
  memdown.reset(/.*/, t.end)
})

test.serial.cb('should get reports for all publishers', function (t) {
  var date = '2021-04-06'
  tk.freeze(new Date(date))

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var publisher1 = {
    id: 'publisher11'
  }

  var publisher2 = {
    id: 'publisher12'
  }

  var url = `/redirect?origin=or1&publisher=${publisher1.id}`

  Publishers.put(publisher1, function (err) {
    t.falsy(err, 'Should not error')
    Publishers.put(publisher2, function (err) {
      t.falsy(err, 'Should not error')
      Targets.put(target, function (err) {
        t.falsy(err, 'Should not error')
        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'Should not error')
          var location = res.headers.location
          t.is(location, `/visit#${target.url}`, 'correct url')
          url = `/redirect?origin=or1&publisher=${publisher2.id}`
          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'Should not error')
            location = res.headers.location
            t.is(location, `/visit#${target.url}`, 'correct url')
            url = '/reports?dateStart=2021-04-06&dateEnd=2021-04-06'
            servertest(server(), url, getOpts, function (err, res) {
              t.falsy(err, 'Should not error')
              t.is(res.body.length, 4, 'correct number or reports')
              t.end()
            })
          })
        })
      })
    })
  })
})

test.serial.cb('should get report by publisher', function (t) {
  var date = '2021-04-06'
  tk.freeze(new Date(date))

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var publisher1 = {
    id: 'publisher11'
  }

  var publisher2 = {
    id: 'publisher12'
  }

  Publishers.put(publisher1, function (err) {
    t.falsy(err, 'Should not error')
    Publishers.put(publisher2, function (err) {
      t.falsy(err, 'Should not error')
      Targets.put(target, function (err) {
        t.falsy(err, 'Should not error')
        var url = `/redirect?origin=or1&publisher=${publisher1.id}`
        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'Should not error')

          var location = res.headers.location
          t.is(location, `/visit#${target.url}`, 'correct url')
          tk.freeze(new Date('2021-04-07'))

          var url = `/redirect?origin=or1&publisher=${publisher2.id}`
          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'Should not error')

            var location = res.headers.location
            t.is(location, `/visit#${target.url}`, 'correct url')

            url = `/reports?dateStart=2021-04-06&dateEnd=2021-04-07&filterBy=publisherId&filterValue=${publisher1.id}`
            servertest(server(), url, getOpts, function (err, res) {
              t.falsy(err, 'Should not error')

              t.is(res.body.length, 2, 'correct number or reports')
              t.end()
            })
          })
        })
      })
    })
  })
})

test.serial.cb('should not get report for publisher that does not exist', function (t) {
  var date = '2021-04-06'
  tk.freeze(new Date(date))

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var publisher = {
    id: 'publisher12'
  }

  var visitor = {
    ip: '64.186.123.00',
    publisher: publisher.id,
    origin: 'or1',
    tier: '0.50'
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'Should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'Should not error')
      var url = '/api/advertisers'
      t.falsy(err, 'Should not error')
      url = '/route'
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'Should not error')

        t.is(res.body.decision, 'accept')
        url = `/reports?dateStart=${date}&dateEnd=${date}&filterBy=publisherId&filterValue=pubbb`
        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'Should not error')

          t.is(res.body.length, 0, 'Should have no reports')
          url = `/reports?dateStart=${date}&dateEnd=${date}&filterBy=publisherId&filterValue=${publisher.id}`

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'Should not error')

            t.is(res.body.length, 1, 'should have report for correct publisher id')
            t.end()
          })
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should get report by advertiserId', function (t) {
  var date = '2021-04-06'
  tk.freeze(new Date(date))

  var target1 = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var target2 = {
    id: 'tar2-1',
    rateType: 'accept',
    url: 'https://doma.com/',
    rateAmount: 10,
    accept: {
      origin: { $in: ['or2'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var visitor1 = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    origin: 'or1',
    tier: '0.50'
  }

  var visitor2 = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    origin: 'or2',
    tier: '0.50'
  }

  var advertiser = {
    id: 'advertiser',
    targets: [target1, target2],
    accessList: ['test@interlincx.com']
  }

  var url = '/route'

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'Should not error')
    Targets.put(target1, function (err) {
      t.falsy(err, 'Should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'Should not error')
        servertest(server(), '/api/advertisers', postOpts, function (err) {
          t.falsy(err, 'Should not error')
          servertest(server(), url, postOpts, function (err, res) {
            t.falsy(err, 'Should not error')

            t.is(res.body.decision, 'accept', 'correct decision')
            tk.freeze(new Date('2021-04-07'))
            servertest(server(), url, postOpts, function (err, res) {
              t.falsy(err, 'Should not error')

              t.is(res.body.decision, 'accept', 'correct decision')
              var requestId = res.body.url.split('visit/')[1]
              url = `/visit/${requestId}`

              servertest(server(), url, getOpts, function (err, res) {
                t.falsy(err, 'Should not error')

                var location = res.headers.location
                t.is(location, `${target2.url}?requestId=${requestId}`, 'url should match')
                url = `/reports?dateStart=2021-04-06&dateEnd=2021-04-07&filterBy=advertiserId&filterValue=${advertiser.id}`
                servertest(server(), url, getOpts, function (err, res) {
                  t.falsy(err, 'Should not error')

                  t.is(res.body.length, 3, 'correct number or reports')
                  t.is(res.body[0].type, 'accept', 'the first event type should be accept')
                  t.is(res.body[2].type, 'visit', 'the last event type should be visit')
                  t.end()
                })
              })
            }).end(JSON.stringify(visitor2))
          }).end(JSON.stringify(visitor1))
        }).end(JSON.stringify(advertiser))
      })
    })
  })
})

test.serial.cb('should not get report for advertiser that does not exist', function (t) {
  var date = '2021-04-06'
  tk.freeze(new Date(date))

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var advertiser = {
    id: 'adv',
    targets: [target],
    accessList: ['test@interlincx.com']
  }

  var publisher = {
    id: 'publisher'
  }

  var visitor = {
    ip: '64.186.123.00',
    publisher: publisher.id,
    origin: 'or1',
    tier: '0.50'
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'Should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'Should not error')
      var url = '/api/advertisers'
      servertest(server(), url, postOpts, function (err) {
        t.falsy(err, 'Should not error')
        url = '/route'
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'Should not error')

          t.is(res.body.decision, 'accept')
          url = `/reports?dateStart=${date}&dateEnd=${date}&filterBy=advertiserId&filterValue=addvv`
          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'Should not error')

            t.is(res.body.length, 0, 'Should have no reports')
            url = `/reports?dateStart=${date}&dateEnd=${date}&filterBy=advertiserId&filterValue=${advertiser.id}`

            servertest(server(), url, getOpts, function (err, res) {
              t.falsy(err, 'Should not error')

              t.is(res.body.length, 1, 'should have report for correct advertiser id')
              t.end()
            })
          })
        }).end(JSON.stringify(visitor))
      }).end(JSON.stringify(advertiser))
    })
  })
})

test.serial.cb('should get advertiser report', function (t) {
  var date = '2020-10-10'
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
    advertiserId: 'acceptedAdvertiser',
    accept: {
      origin: { $in: ['or2'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var advertiser1 = {
    id: 'ad1',
    targets: [target1],
    accessList: ['test@interlincx.com']
  }

  var advertiser2 = {
    id: 'acceptedAdvertiser',
    targets: [target2],
    accessList: ['test@interlincx.com']
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

  var expectedReport1 = [
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target1.id,
      originId: target1.accept.origin.$in[0],
      eventType: 'impression',
      date,
      count: '1',
      rateAmount: target1.rateAmount,
      revenue: target1.rateAmount
    }
  ]

  var expectedReport2 = [
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target2.id,
      originId: target2.accept.origin.$in[0],
      subId: visitor2.subid,
      eventType: 'impression',
      date,
      count: '2',
      rateAmount: target2.rateAmount,
      revenue: target2.rateAmount * 2
    }
  ]

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var query = { advertiserId: advertiser1.id, dateStart: date, dateEnd: date }

  async.parallel([
    cb => async.map([target1, target2], Targets.put, cb),
    cb => Publishers.put(publisher, cb),
    cb => async.map([advertiser1, advertiser2], Advertisers.put, cb)
  ], function (err) {
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
          url = '/api/advertiser-report'
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.success, true, 'successfull request')
            url += `?${qs(query)}`
            opts = { method: 'GET', encoding: 'json' }
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              t.deepEqual(res.body, expectedReport1, 'reports should match')
              query.advertiserId = advertiser2.id
              url = `/api/advertiser-report?${qs(query)}`
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                t.deepEqual(res.body, expectedReport2, 'reports should match')
                t.end()
              })
            })
          }).end(JSON.stringify({ date }))
        }).end(JSON.stringify(visitor2))
      }).end(JSON.stringify(visitor2))
    }).end(JSON.stringify(visitor1))
  })
})

test.serial.cb('should get offer on advertiser report of previous days', function (t) {
  var date = '2021-03-03'
  tk.freeze(new Date(date))

  var target = {
    id: 'tar1-1',
    rateAmount: 20,
    url: 'https://domain.com/',
    rateType: 'accept',
    advertiserId: 'ad1',
    accept: {
      origin: { $in: ['or1'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var advertiser = {
    id: 'ad1',
    targets: [target],
    accessList: ['test@interlincx.com']
  }

  var visitor = {
    ip: '64.186.123.00',
    publisher: 'pub1',
    subid: 'sub1',
    origin: 'or1',
    tier: '0.50'
  }

  var expectedReport = [
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target.id,
      originId: target.accept.origin.$in[0],
      eventType: 'impression',
      date,
      offer: 'target1/offer',
      count: '1',
      rateAmount: target.rateAmount,
      revenue: target.rateAmount
    }
  ]

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var query = { advertiserId: advertiser.id, dateStart: date, dateEnd: date }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'Should not error')

    Advertisers.put(advertiser, function (err) {
      t.falsy(err, 'Should not error')

      Targets.put(target, function (err) {
        t.falsy(err, 'Should not error')

        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'Should not error')

          t.is(res.body.decision, 'accept', 'decision should match')
          target.offer = 'target1/offer'
          Targets.put(target, function (err) {
            t.falsy(err, 'Should not error')

            var url = `/api/advertiser-report?${qs(query)}`
            opts = { method: 'GET', encoding: 'json' }
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'Should not error')

              t.deepEqual(res.body, expectedReport, 'resports should match')
              t.end()
            })
          })
        }).end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('should give advertiser report with restricted start date', function (t) {
  var date1 = '2020-10-10'
  var date2 = '2020-10-11'
  var date3 = '2020-10-12'
  tk.freeze(new Date(date1))

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
    advertiserId: 'restrictedAdvertiser',
    accept: {
      origin: { $in: ['or2'] }
    }
  }

  var publisher = {
    id: 'pub1'
  }

  var advertiser1 = {
    id: 'ad1',
    targets: [target1],
    accessList: ['test@interlincx.com']
  }

  var advertiser2 = {
    id: 'restrictedAdvertiser',
    targets: [target2],
    accessList: ['test@interlincx.com']
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

  var expectedReport1 = [
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target1.id,
      originId: target1.accept.origin.$in[0],
      eventType: 'impression',
      date: date1,
      count: '1',
      rateAmount: target1.rateAmount,
      revenue: target1.rateAmount
    },
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target1.id,
      originId: target1.accept.origin.$in[0],
      eventType: 'impression',
      date: date2,
      count: '1',
      rateAmount: target1.rateAmount,
      revenue: target1.rateAmount
    },
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target1.id,
      originId: target1.accept.origin.$in[0],
      eventType: 'impression',
      date: date3,
      count: '1',
      rateAmount: target1.rateAmount,
      revenue: target1.rateAmount
    }
  ]

  var expectedReport2 = [
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target2.id,
      originId: target2.accept.origin.$in[0],
      eventType: 'impression',
      date: date2,
      count: '1',
      rateAmount: target2.rateAmount,
      revenue: target2.rateAmount
    },
    {
      _path: 'targetId/originId/subId/eventType',
      targetId: target2.id,
      originId: target2.accept.origin.$in[0],
      eventType: 'impression',
      date: date3,
      count: '1',
      rateAmount: target2.rateAmount,
      revenue: target2.rateAmount
    }
  ]

  var query = { advertiserId: advertiser1.id, dateStart: date1, dateEnd: date3 }

  async.parallel([
    cb => async.map([target1, target2], Targets.put, cb),
    cb => Publishers.put(publisher, cb),
    cb => async.map([advertiser1, advertiser2], Advertisers.put, cb)
  ], function (err) {
    t.falsy(err, 'should not error')
    async.mapSeries(
      [
        [visitor1, date1],
        [visitor2, date1],
        [visitor1, date2],
        [visitor2, date2],
        [visitor1, date3],
        [visitor2, date3]
      ],
      sendVisitorRequest,
      function (err, result) {
        t.falsy(err, 'should not error')
        t.is(result[0].body.decision, 'accept', 'match decision')
        async.map(
          [date1, date2, date3],
          storeAdvertiserReport,
          function (err, result) {
            t.falsy(err, 'should not error')
            t.is(result[1].body.success, true, 'successfull request')
            var url = `/api/advertiser-report?${qs(query)}`
            var opts = { method: 'GET', encoding: 'json' }
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              t.deepEqual(res.body, expectedReport1, 'reports should match')
              query.advertiserId = advertiser2.id
              url = `/api/advertiser-report?${qs(query)}`
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                t.deepEqual(res.body, expectedReport2, 'reports should match')
                t.end()
              })
            })
          })
      })
  })
})

test.cb('should not crush server on /reports-data on incorrect date', function (t) {
  var url = '/reports-data?dateStart=2018-05-44&dateEnd=2018-55-12'
  servertest(server(), url, getOpts, function (err, res) {
    t.falsy(err, 'should not error')
    t.is(res.body.error, 'Unrecognized date format. Try YYYY-MM-DD', 'match error')
    t.end()
  })
})

test.cb('should not crush server on /reports-data?', function (t) {
  var url = '/reports-data?dateStart=2018-05-13'
  servertest(server(), url, getOpts, function (err, res) {
    t.falsy(err, 'should not error')

    t.is(res.body.error, 'dateStart and dateEnd or date required', 'match error')
    t.end()
  })
})

test.serial.cb('should get correct number of reports', function (t) {
  var url = '/route'
  tk.freeze(new Date('2018-05-13'))
  var target = {
    id: 'targegt1',
    url: 'http://some.com/',
    accept: {
      income: {
        $gt: 10
      }
    }
  }
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err) {
        t.falsy(err, 'should not error')

        servertest(server(), url, postOpts, function (err) {
          t.falsy(err, 'should not error')

          var url = '/reports-data?dateStart=2018-05-13&dateEnd=2018-05-13'

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.length, 2, 'match report length')
            t.is(res.body[0].targetId, target.id, 'match dimension value')
            tk.reset()
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
        .end(JSON.stringify(Object.assign({}, visitor, { income: 20 })))
    })
  })
})

test.serial.cb('add additional dimensions to report', function (t) {
  var url = '/route'
  tk.freeze(new Date('2018-05-13'))
  var target = {
    id: 'targegt1',
    url: 'http://some.com/',
    accept: {
      income: {
        $gt: 10
      }
    }
  }
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err) {
        t.falsy(err, 'should not error')

        servertest(server(), url, postOpts, function (err) {
          t.falsy(err, 'should not error')
          const dimensions = JSON.stringify(['publisher', 'olpStatus'])

          var url = `/reports-data?dateStart=2018-05-13&dateEnd=2018-05-13&dimensions=${dimensions}`

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body[0].publisher, publisherId, 'match dimension value')
            t.is(res.body[0].olpStatus, 'UNIQUE', 'match dimension value')
            t.is(res.body.length, 2, 'match report length')
            tk.reset()
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
        .end(JSON.stringify(Object.assign({}, visitor, { income: 20 })))
    })
  })
})

function sendVisitorRequest ([visitor, date], cb) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  tk.freeze(new Date(date))
  servertest(server(), url, opts, cb).end(JSON.stringify(visitor))
}

function storeAdvertiserReport (date, cb) {
  var url = '/api/advertiser-report'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, cb).end(JSON.stringify({ date }))
}

test.serial.cb('store info for requestId', function (t) {
  var target = {
    id: 'targegt1',
    url: 'http://some.com/',
    accept: {
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      servertest(server(), url, { method: 'POST', encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        url = `/get-request-id-info/${requestId}`
        servertest(server(), url, { method: 'GET', encoding: 'json' }, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.geoCity, 'Metlakatla', 'correct geo city property')
          t.is(res.body.publisher, '124124', 'correct publisher property')
          t.is(res.body.targetId, 'targegt1', 'correct target id property')

          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.cb('should not crash server on incorrect requestId', function (t) {
  var url = '/get-request-id-info/12124214'
  servertest(server(), url, { method: 'GET', encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.end()
  })
})

test.serial.cb('should have label for visit from desktop device on report', function (t) {
  tk.freeze(new Date('2017-11-02'))
  var headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36' }

  var opts = { method: 'POST', encoding: 'json', headers }
  var target = {
    id: 'target12',
    name: 'TrafficDesktop',
    publisher: publisherId,
    tier: '0.5',
    accept: {}
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        tier: '0.5',
        publisher: publisherId
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var opts = { method: 'GET', encoding: 'json' }
        var requestId = res.body.url.split('visit')[2]
        url = `/visit/${requestId}`

        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          dateRangeReport({ dateStart: '2017-11-02', dateEnd: '2017-11-02' }, function (err, res) {
            t.falsy(err, 'should not error')
            var visits = res.filter(event => event.device === 'desktop')
            t.is(visits.length, 1, 'visits length should be correct')

            tk.reset()
            t.end()
          })
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

function dateRangeReport ({ dateStart, dateEnd }, cb) {
  var result = []
  Events.getDateRangeReport({ dateStart, dateEnd })
    .on('data', function (data) {
      result.push(data)
    })
    .on('end', function () {
      return cb(null, result)
    })
}
