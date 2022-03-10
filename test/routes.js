process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var tk = require('timekeeper')
var parseString = require('xml2js').parseString
var stdout = require('test-console').stdout
var slug = require('cuid').slug

var server = require('../lib/server')
var db = require('../lib/db')
var memdown = require('../lib/multilevel')
var Targets = require('../lib/models/targets')
var Events = require('../lib/models/events')
var Publishers = require('../lib/models/publisher')
var Origins = require('../lib/models/origins')
var IpAddressLastAccept = require('../lib/models/ip-address-last-accept')

const publisherId = '124124'
const constPublisher = {
  id: publisherId,
  origins: { origin1: { id: 'origin1' } }
}
const visitor = {
  ip: '64.186.123.21',
  publisher: publisherId,
  origin: 'origin1',
  tier: '0.50'
}
const originId = 'origin1'
const constOrigin = {
  id: originId,
  originPixel: 'origin.com'
}

const postOpts = { method: 'POST', encoding: 'json' }
const getOpts = { method: 'GET', encoding: 'json' }

var targetFactory = ({
  name, url, maxAcceptsPerDay, endpoint, rateType, rateAmount, accept,
  advertiserId, oldTargetId, preserveReferrer, publishers, ...props
}) =>
  ({
    id: slug(),
    name: name || 'ponchoman',
    url: url || `http://some${slug()}.ru/`,
    maxAcceptsPerDay: maxAcceptsPerDay || 10000,
    endpoint: endpoint || 1956,
    rateType: rateType || 'accept',
    rateAmount: rateAmount || 0.9,
    accept: accept || { geoState: { $in: ['ak'] } },
    advertiserId: advertiserId || 'guinness1759',
    oldTargetId: oldTargetId || null,
    preserveReferrer: preserveReferrer || null,
    publishers: publishers || [],
    ...props
  })

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.cb('should return 400 error when input data is not valid on /route', function (t) {
  var url = '/route'
  var invalidVisitor = {
    ip: '64.186.123.21'
  }

  servertest(server(), url, postOpts, function (err, res) {
    t.falsy(err, 'should not error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.body.error, 'Bad Request - does not contain IP, publisher, or tier', 'error match')
    t.end()
  })
    .end(JSON.stringify(invalidVisitor))
})

test.serial.cb('should chose correct target based on state', function (t) {
  var target1 = targetFactory({
    accept: { geoState: { $in: ['we'] } }
  })
  var target2 = targetFactory({})
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target1, function (err) {
      t.falsy(err, 'should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'should not error')
        var url = '/route'
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var requestId = res.body.url.split('visit/')[1]
          url = `/visit/${requestId}`

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'should not error')
            var location = res.headers.location
            t.is(location, `${target2.url}?requestId=${requestId}`, 'url should match')
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('should chose correct target with $nin param', function (t) {
  var target1 = targetFactory({
    accept: {
      geoState: { $nin: ['ala'] }
    }
  })
  var target2 = targetFactory({})
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target1, function (err) {
      t.falsy(err, 'should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'should not error')
        var url = '/route'
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var requestId = res.body.url.split('visit/')[1]
          url = `/visit/${requestId}`

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'should not error')
            var location = res.headers.location
            t.is(location, `${target1.url}?requestId=${requestId}`, 'url should match')
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('should count traffic for target', function (t) {
  var url = '/route'
  var postOpts = { method: 'POST', encoding: 'json' }
  var target1 = targetFactory({
    maxAcceptsPerDay: 1
  })
  var target2 = targetFactory({
    maxAcceptsPerDay: 3
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target1, function (err) {
      t.falsy(err, 'should not error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'should not error')
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var requestId = res.body.url.split('visit/')[1]
          url = `/visit/${requestId}`

          servertest(server(), url, getOpts, function (err, res) {
            t.falsy(err, 'should not error')
            var location = res.headers.location
            t.is(location, `${target1.url}?requestId=${requestId}`, 'url should match')
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('accept x-www-form-urlencoded content-type in decide route', function (t) {
  var url = '/route'
  var headers = { 'content-type': 'application/x-www-form-urlencoded' }

  var opts = { method: 'POST', headers }

  var target = targetFactory({
    maxAcceptsPerDay: 1
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'No error')

    Targets.put(target, function (err) {
      t.falsy(err, 'Should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.end()
      })
        .end(`ip=134.201.250.155&tier=0.5&publisher=${publisherId}`)
    })
  })
})

test.serial.cb('return response in xml format when option present', function (t) {
  var url = '/route?output=xml'
  var opts = { method: 'POST', encoding: 'text/xml' }

  var target = targetFactory({
    maxAcceptsPerDay: 1
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'Should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'Should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.is(res.headers['content-type'],
          'text/xml', 'correct statusCode')
        parseString(res.body, function (err, result) {
          t.falsy(err, 'should not error')
          t.is(result.response.decision[0], 'accept', 'correct decision')
          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.cb('return reject when input data is a string', function (t) {
  var url = '/route?output=xml'
  var opts = { method: 'POST', encoding: 'text/xml' }

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'should not error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.headers['content-type'],
      'text/xml', 'correct statusCode')
    parseString(res.body, function (err, result) {
      t.falsy(err, 'should not error')
      t.truthy(result.response.error[0], 'error exist')
      t.end()
    })
  })
    .end(JSON.stringify('bla'))
})

test.cb('return reject when input data does not have ip', function (t) {
  var url = '/route?output=xml'
  var opts = { method: 'POST', encoding: 'text/xml' }

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'should not error')
    t.is(res.statusCode, 400, 'correct statusCode')
    t.is(res.headers['content-type'],
      'text/xml', 'correct statusCode')
    parseString(res.body, function (err, result) {
      t.falsy(err, 'should not error')
      t.truthy(result.response.error[0], 'error exist')
      t.end()
    })
  })
    .end(JSON.stringify({ ips: '191.2922' }))
})

test.serial.cb('parse target url as a template', function (t) {
  var url = '/route'
  var target = targetFactory({
    url: 'https://domain.com/?param={{publisher}}&price={{tier}}'
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var visitor = {
        ip: '64.186.123.21',
        publisher: publisherId,
        tier: '0.50'
      }
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        url = `/visit/${requestId}`

        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var location = res.headers.location
          var actualUrl = `https://domain.com/?requestId=${requestId}&param=${publisherId}&price=0.50`
          t.is(location, actualUrl, 'url should match')
          t.is(res.statusCode, 301, 'url should match')
          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('store nathan response', function (t) {
  var url = '/route'
  tk.freeze(new Date('2018-09-13'))
  var target = targetFactory({
    accept: {
      nathanStatus: {
        $eq: 'SOLD'
      },
      nathanNDaysLastSeen: {
        $lte: '3'
      }
    }
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        var opts = { method: 'GET', encoding: 'json' }
        var requestId = res.body.url.split('visit/')[1]
        url = `/visit/${requestId}`
        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var location = res.headers.location
          t.is(location, `${target.url}?requestId=${requestId}`, 'url should match')
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.statusCode, 404, 'should 404')
            tk.reset()
            t.end()
          })
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('populate url with target values /route', function (t) {
  var url = '/route'
  var target = targetFactory({
    url: 'https://domain.com/?param={{publisher}}&price={{tier}}&subid={{endpoint}}',
    endpoint: 1000
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var visitor = {
        ip: '64.186.123.21',
        publisher: publisherId,
        tier: '0.50'
      }
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        url = `/visit/${requestId}`
        servertest(server(), url, getOpts, function (err, res) {
          t.falsy(err, 'should not error')
          var location = res.headers.location
          var actualUrl = `https://domain.com/?requestId=${requestId}&param=${publisherId}&price=0.50&subid=1000`
          t.is(location, actualUrl, 'url should match')
          t.is(res.statusCode, 301, 'url should match')
          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('not match when visitor props dont match', function (t) {
  var target = targetFactory({
    accept: {
      publisher: { $eq: 'another publisher' }
    }
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err, tt) {
      t.falsy(err, 'should not error')
      var url = '/route'

      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'should reject visitor')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accept than we have not seen visitor', function (t) {
  var target = targetFactory({
    accept: {
      lastAccept: { $gt: '5' }
    }
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'should reject visitor')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('get ratespecial7 criteria', function (t) {
  var url = '/route'
  var target = targetFactory({
    accept: {
      ratespecial7: { $eq: true }
    }
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')

      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('filter by neverSeen criteria', function (t) {
  var url = '/route'
  var target = targetFactory({
    accept: {
      neverSeen: { $eq: false }
    }
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('compute score for target', function (t) {
  tk.freeze(new Date('2018-10-13'))

  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    maxAcceptsPerDay: 100,
    accept: {
      geoState: { $in: ['ak', 'we'] }
    }
  }

  var val2 = {
    id: '12',
    url: 'https://domain2.com/',
    maxAcceptsPerDay: 100,
    accept: {
      geoState: { $in: ['ak', 'we'] }
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val2, function (err) {
        t.falsy(err, 'should not error')
        var visitor1 = {
          ip: '64.186.123.21',
          tier: '0.5',
          publisher: publisherId
        }
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')

          var opts2 = { method: 'GET', encoding: 'json' }
          var requestId = res.body.url.split('visit/')[1]
          var url2 = `/visit/${requestId}`
          servertest(server(), url2, opts2, function (err, res) {
            t.falsy(err, 'should not error')
            var location = res.headers.location
            t.deepEqual(location, `${val2.url}?requestId=${requestId}`, 'url should match')

            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                var requestId = res.body.url.split('visit/')[1]
                url2 = `/visit/${requestId}`
                servertest(server(), url2, opts2, function (err, res) {
                  t.falsy(err, 'should not error')
                  var location = res.headers.location
                  t.deepEqual(location, `${val1.url}?requestId=${requestId}`, 'url should match')

                  servertest(server(), url, opts, function (err, res) {
                    t.falsy(err, 'should not error')
                    var requestId = res.body.url.split('visit/')[1]
                    url2 = `/visit/${requestId}`
                    servertest(server(), url2, opts2, function (err, res) {
                      t.falsy(err, 'should not error')
                      var location = res.headers.location
                      t.deepEqual(location, `${val1.url}?requestId=${requestId}`, 'url should match')
                      servertest(server(), url, opts, function (err, res) {
                        t.falsy(err, 'should not error')
                        t.truthy(res.body, 'should body exist')
                        t.is(res.body.decision, 'accept', 'match decision')
                        var requestId = res.body.url.split('visit/')[1]
                        url2 = `/visit/${requestId}`

                        servertest(server(), url2, opts2, function (err, res) {
                          t.falsy(err, 'should not error')
                          var location = res.headers.location
                          t.deepEqual(location, `${val2.url}?requestId=${requestId}`, 'url should match')
                          tk.reset()
                          t.end()
                        })
                      })
                        .end(JSON.stringify(visitor1))
                    })
                  })
                    .end(JSON.stringify(visitor1))
                })
              })
                .end(JSON.stringify(visitor1))
            })
              .end(JSON.stringify(visitor1))
          })
        })
          .end(JSON.stringify(visitor1))
      })
    })
  })
})

test.serial.cb('flush memdown', function (t) {
  memdown.reset(/.*/, t.end)
})

test.serial.cb('should get visit from report', function (t) {
  tk.freeze(new Date('2017-11-02'))

  var opts = { method: 'POST', encoding: 'json' }
  var target = targetFactory({})

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
            var visits = res.filter(event => event.type === 'visit')
            t.is(visits.length, 1, 'visits length should be correct')

            tk.reset()
            t.end()
          })
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should use publishers inside target', function (t) {
  var opts = { method: 'POST', encoding: 'json' }

  var val2 = {
    id: '12',
    url: 'http://example.com12/',
    maxAcceptsPerDay: 10,
    accept: {
      geoState: {
        $in: [
          'ak',
          'ny'
        ]
      },
      publisher: { $eq: 'abccc' }
    },
    publishers: [
      { publisherId: 'abc', maxAcceptsPerDay: 10, tier: '0.5' }
    ]
  }
  var publisher = {
    id: 'abc'
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val2, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        publisher: 'abc',
        tier: '0.5',
        publisherSub: 'xyz'
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var opts = { method: 'GET', encoding: 'json' }
        var requestId = res.body.url.split('visit')[2]
        url = `/visit/${requestId}`

        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          servertest(server(), '/api/targets/12', opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.publishers[0].traffic, 1, 'traffic should match')
            t.is(res.body.traffic, 1, 'traffic should match')
            t.end()
          })
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

// tape('filter based on olp criteria', function (t) {
//   var url = '/route'
//   var target = targetFactory({
//     'accept': {
//       olpStatus: {
//         '$eq': 'UNIQUE'
//       }
//     }
//   })
//
//   Publishers.put(constPublisher, function (err) {
//     t.ifError(err, 'should not error')
//
//     Targets.put(target, function (err) {
//       t.ifError(err, 'should not error')
//       servertest(server(), url, postOpts, function (err, res) {
//         t.ifError(err, 'should not error')
//         t.equal(res.body.decision, 'accept', 'match decision')
//         t.end()
//       })
//         .end(JSON.stringify(visitor))
//     })
//   })
// })

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

test.serial.cb('get target by income criteria', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }

  var target = targetFactory({
    accept: {
      income: {
        $gt: 10
      }
    }
  })
  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    tier: '0.50',
    income: 11
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')

      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('get target by creditScore criteria', function (t) {
  var url = '/route'
  var target = targetFactory({
    accept: {
      creditScore: {
        $gt: 10
      }
    }
  })
  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    tier: '0.50',
    creditScore: 11
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'Should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('flush before no target if credit store criteria mismatch', function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('not get target if creditScore criteria dont match', function (t) {
  var url = '/route'
  var target = targetFactory({
    accept: {
      creditScore: {
        $gt: 10
      }
    }
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should reject when pubtier cap is exceeded', function (t) {
  var target = targetFactory({
    accept: {
      publisher: { $eq: 'abc', $nin: ['bla'] },
      tier: { $eq: '0.5' }
    },
    publishers: [
      { publisherId: publisherId, maxAcceptsPerDay: 1, tier: '0.5' }
    ]
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')

        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'match decision')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should not accept user twice a day if flag is true', function (t) {
  tk.freeze(new Date('2018-09-13'))
  var url = '/route'
  var target = targetFactory({
    accept: {
      creditScore: {
        $gt: 10
      },
      uniqueDailyIP: {
        $eq: true
      }
    }
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var copyVisitor = Object.assign({}, visitor, {
        creditScore: '12'
      })
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'match decision')
          tk.freeze(new Date('2018-09-14'))
          servertest(server(), url, postOpts, function (err, res) {
            t.falsy(err, 'should not error')

            t.is(res.body.decision, 'accept', 'match decision')
            tk.reset()
            t.end()
          })
            .end(JSON.stringify(copyVisitor))
        })
          .end(JSON.stringify(copyVisitor))
      })
        .end(JSON.stringify(copyVisitor))
    })
  })
})

test.serial.cb('should accept user twice a day if flag dont exist', function (t) {
  var url = '/route'
  var target = targetFactory({
    accept: {
      creditScore: {
        $gt: 10
      }
    }
  })

  var copyVisitor = Object.assign({}, visitor, {
    creditScore: '12'
  })
  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'accept', 'match decision')
          t.end()
        })
          .end(JSON.stringify(copyVisitor))
      })
        .end(JSON.stringify(copyVisitor))
    })
  })
})

test.serial.cb('should choose correct target based on state', function (t) {
  tk.freeze(new Date('2018-03-13'))
  var target = targetFactory({})

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        Targets.getTrafficTargetTierPublisher({
          date: '2018-03-13',
          publisher: visitor.publisher,
          targetId: target.id,
          tier: visitor.tier
        }, function (err, traffic) {
          t.falsy(err, 'should not error')
          t.is(traffic, 1, 'traffic should match')
          tk.reset()
          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should visit origin postback', function (t) {
  var url = '/route'
  var inspect = stdout.inspect()
  var target = targetFactory({})

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'no error')

    Origins.put(constOrigin, function (err) {
      t.falsy(err, 'no error')

      Targets.put(target, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          inspect.restore()
          var containsPixelUrl = !!inspect.output.find(out => out.includes('originPixelUrl'))
          t.true(containsPixelUrl, 'visit origin pixel')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('should save ip last seen on /route', function (t) {
  var url = '/route'
  tk.freeze(new Date('2018-10-13'))
  var target = targetFactory({})

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'no error')

    Origins.put(constOrigin, function (err) {
      t.falsy(err, 'no error')

      Targets.put(target, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, postOpts, function (err) {
          t.falsy(err, 'should not error')
          IpAddressLastAccept.get(visitor.ip, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res, '2018-10-13', 'dates should match')
            tk.reset()
            t.end()
          })
        })
          .end(JSON.stringify(visitor))
      })
    })
  })
})

test.serial.cb('should show the real publishers referer to the advertiser for the specified targets', function (t) {
  var url = '/route'
  var target = targetFactory({
    preserveReferrer: true
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.is(res.body.url.includes('visit#'), false, 'no hash in the returned url')
        t.end()
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accept traffic with jordanClickId', function (t) {
  var url = '/route'

  var target = targetFactory({
    accept: {
      jordanClickId: { $eq: '111111111' }
    }
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should reject when pubtier cap is exceeded with origin in accept', function (t) {
  var target = targetFactory({
    accept: {
      publisher: { $eq: 'abs', $nin: ['bla'] },
      tier: { $eq: '0.50' },
      origin: { $eq: 'origin1' }
    },
    publishers: [
      { publisherId: publisherId, maxAcceptsPerDay: 1, origin: 'origin1' }
    ]
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      servertest(server(), url, postOpts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')

        servertest(server(), url, postOpts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'match decision')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should use origin`s arbitrary params instead of post params', function (t) {
  var val1 = targetFactory({
    accept: {
      tier: { $lt: 0.8 }
    }
  })

  var val2 = targetFactory({
    accept: {
      tier: { $lt: 0.5 }
    }
  })

  var originEntity = {
    id: 'origin1',
    arbitraryParams: {
      param1: 15,
      tier: 0.3
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')
    Origins.put(originEntity, function (err) {
      t.falsy(err, 'no error')

      Targets.put(val1, function (err) {
        t.falsy(err, 'should not error')
        Targets.put(val2, function (err) {
          t.falsy(err, 'should not error')
          var url = '/route'
          servertest(server(), url, postOpts, function (err, res) {
            t.falsy(err, 'should not error')
            var requestId = res.body.url.split('visit/')[1]
            url = `/visit/${requestId}`

            servertest(server(), url, getOpts, function (err, res) {
              t.falsy(err, 'should not error')
              var location = res.headers.location
              t.is(location, `${val1.url}?requestId=${requestId}`, 'url should match')
              originEntity.arbitraryParams.tier = 0.6
              Origins.put(originEntity, function (err) {
                t.falsy(err, 'no error')

                var url = '/route'

                servertest(server(), url, postOpts, function (err, res) {
                  t.falsy(err, 'should not error')
                  var requestId = res.body.url.split('visit/')[1]
                  url = `/visit/${requestId}`

                  servertest(server(), url, getOpts, function (err, res) {
                    t.falsy(err, 'should not error')
                    var location = res.headers.location
                    t.is(location, `${val1.url}?requestId=${requestId}`, 'url should match')
                    t.end()
                  })
                })
                  .end(JSON.stringify(visitor))
              })
            })
          })
            .end(JSON.stringify(visitor))
        })
      })
    })
  })
})

test.serial.cb('should call external APIs even if origin\'s property noExternalRequests is true in the request to /route', function (t) {
  var url = '/route'

  const constOrigin = {
    id: 'origin1',
    noExternalRequests: true
  }
  Origins.put(constOrigin, function (err) {
    t.falsy(err, 'should not error')
    var inspect = stdout.inspect()
    servertest(server(), url, postOpts, function (err, res) {
      t.falsy(err, 'should not error')
      inspect.restore()
      var containsCheckNathan = !!inspect.output.find(out => out.includes('nathan'))
      var containsCheckRatespecial = !!inspect.output.find(out => out.includes('ratespecial'))
      // var containsOLP = !!inspect.output.find(out => out.includes('OLP'))
      var containsCheckJordan = !!inspect.output.find(out => out.includes('Jordan Age'))
      // var containsCheckLeadsmarket = !!inspect.output.find(out => out.includes('leadsmarket'))
      var containsCheckStopGo = !!inspect.output.find(out => out.includes('Stopgo'))
      var containsCheckGeo = !!inspect.output.find(out => out.includes('Geometer'))
      t.is(containsCheckNathan, true, 'should call Nathan')
      t.is(containsCheckRatespecial, true, 'should call Ratespecial')
      // t.equal(containsOLP, true, 'should call OLP')
      t.is(containsCheckJordan, true, 'should call Jordan')
      // t.equal(containsCheckLeadsmarket, true, 'should call Leadsmarket')
      t.is(containsCheckStopGo, true, 'should call Stopgo')
      t.is(containsCheckGeo, true, 'should call Geometer')
      t.end()
    }).end(JSON.stringify(visitor))
  })
})

test.serial.cb('should call external APIs even if noExternalCalls param is sent in the request to /route', function (t) {
  var target2 = targetFactory({})

  Targets.put(target2, function (err) {
    t.falsy(err, 'should not error')
    var url = '/route'
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: 'dddd',
      noExternalCalls: true
    }
    var inspect = stdout.inspect()
    servertest(server(), url, postOpts, function (err, res) {
      t.falsy(err, 'should not error')
      inspect.restore()
      var containsCheckNathan = !!inspect.output.find(out => out.includes('nathan'))
      var containsCheckRatespecial = !!inspect.output.find(out => out.includes('ratespecial'))
      // var containsOLP = !!inspect.output.find(out => out.includes('OLP'))
      t.is(containsCheckNathan, true, 'should call Nathan')
      t.is(containsCheckRatespecial, true, 'should call Ratespecial')
      // t.equal(containsOLP, true, 'should call OLP')
      var containsCheckJordan = !!inspect.output.find(out => out.includes('Jordan Age'))
      // var containsCheckLeadsmarket = !!inspect.output.find(out => out.includes('leadsmarket'))
      var containsCheckStopGo = !!inspect.output.find(out => out.includes('Stopgo'))
      var containsCheckGeo = !!inspect.output.find(out => out.includes('Geometer'))
      t.is(containsCheckNathan, true, 'should call Nathan')
      t.is(containsCheckRatespecial, true, 'should call Ratespecial')
      // t.equal(containsOLP, true, 'should call OLP')
      t.is(containsCheckJordan, true, 'should call Jordan')
      // t.equal(containsCheckLeadsmarket, true, 'should call Leadsmarket')
      t.is(containsCheckStopGo, true, 'should call Stopgo')
      t.is(containsCheckGeo, true, 'should call Geometer')
      t.end()
    })
      .end(JSON.stringify(visitor))
  })
})

test.serial.cb('accept by itmedia rule', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      itMediaCheck: { $eq: 'ok' }
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('reject by itmedia rule', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      itMediaCheck: { $eq: 'reject' }
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accpet by stopgo rule with stopgo age', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      stopgoPresent: { $eq: true },
      stopgoAge: { $gt: 2 }
    }
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accpet by stopgo rule', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      stopgoPresent: { $eq: false }
    }
  }
  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    tier: '0.50'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accept by dobDiff rule', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      dobDiff: { $gte: 12 }
    }
  }
  tk.freeze(new Date('2018-09-13'))

  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    dob: '2006-09-01',
    tier: '0.50'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        tk.reset()
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accept by stopgoAge rule when last_seen is null', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      stopgoAge: { $gt: 10 }
    }
  }
  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    tier: '0.50'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('accept by isIPV6 rule', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'https://domain.com/',
    accept: {
      isIPV6: { $eq: false }
    }
  }
  const visitor = {
    ip: '8.8.8.8',
    publisher: publisherId,
    origin: 'origin1',
    tier: '0.50'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val1, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'accept', 'match decision')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should not crush server on /reports-data?', function (t) {
  var url = '/reports-data?dateStart=2018-05-13'
  servertest(server(), url, getOpts, function (err, res) {
    t.falsy(err, 'should not error')

    t.is(res.body.error, 'dateStart and dateEnd or date required', 'match error')
    t.end()
  })
})

test.serial.cb('selected publishers should not override target\'s rules for tier $in', function (t) {
  var opts = { method: 'POST', encoding: 'json' }

  var target = targetFactory({
    accept: {
      publisher: { $eq: constPublisher.id },
      tier: { $in: ['0.4'] }
    },
    publishers: [
      { publisherId: publisherId, maxAcceptsPerDay: 10, tier: '0.5' }
    ]
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        publisher: constPublisher.id,
        tier: '0.5'
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'should not accept traffic')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('selected publishers should not override target\'s rules for origin $eq', function (t) {
  var opts = { method: 'POST', encoding: 'json' }

  var target = targetFactory({
    accept: {
      publisher: { $eq: constPublisher.id },
      origin: { $eq: 'origin2' }
    },
    publishers: [
      { publisherId: publisherId, maxAcceptsPerDay: 10, origin: 'origin1' }
    ]
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        publisher: constPublisher.id,
        tier: '0.55',
        origin: 'origin1'
      }

      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'should not accept traffic')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('selected publishers should not override target\'s rules for origin $nin', function (t) {
  var opts = { method: 'POST', encoding: 'json' }

  var target = targetFactory({
    accept: {
      publisher: { $eq: constPublisher.id },
      origin: { $nin: ['origin2'] }
    },
    publishers: [
      { publisherId: publisherId, maxAcceptsPerDay: 10, origin: 'origin2' }
    ]
  })

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        publisher: constPublisher.id,
        tier: '0.55',
        origin: 'origin2'
      }

      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.decision, 'reject', 'should not accept traffic')
        t.end()
      })
        .end(JSON.stringify(visitor))
    })
  })
})
