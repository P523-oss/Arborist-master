var test = require('ava')
var servertest = require('servertest')
var tk = require('timekeeper')
var stdout = require('test-console').stdout
var URL = require('url')

var server = require('../../lib/server')
var Targets = require('../../lib/models/targets')
var Publishers = require('../../lib/models/publisher')
var Origins = require('../../lib/models/origins')
var Events = require('../../lib/models/events')
var IpAddressLastAccept = require('../../lib/models/ip-address-last-accept')
var db = require('../../lib/db')
const crypt = require('../../lib/utils/crypt')
const cookieCfg = require('../../config').cookie

var targetFactory = ({ targetId, name, url, endpoint, rateType, rateAmount, rules, advertiserId, oldTargetId, preserveReferrer, ...props }) =>
  ({
    id: targetId || 'obkp21',
    name: name || 'ponchoman',
    url: url || 'http://pfpl.ru',
    endpoint: endpoint || 1956,
    rateType: rateType || 'accept',
    rateAmount: rateAmount || 0.9,
    accept: rules || {},
    advertiserId: advertiserId || 'guinness1759',
    oldTargetId: oldTargetId || null,
    preserveReferrer: preserveReferrer || null,
    ...props
  })

var propertiesToExclude = [
  'accept',
  'userAgent',
  'debtAmount',
  'timeResidence',
  'zipCode',
  'licenseState',
  'bankName',
  'military',
  'dob',
  'payFrequency',
  'loanPurpose',
  'creditScore',
  'requestId',
  'noExternalCalls',
  'originNoExternalRequests',
  'day',
  'geoCity',
  'geoCountry',
  'geoStateFull',
  'geoRegion',
  'stopgoSold',
  'dobDiff',
  'id',
  'url',
  'publishers',
  'advertiserId',
  'maxAcceptsPerDay',
  'modifiedAt',
  'name',
  'rateAmount',
  'vertical',
  'offer',
  'traffic',
  'modifiedBy',
  'rateType',
  'date',
  'eventId'
]

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('return specific target based on origin param', function (t) {
  var url = '/redirect?origin=1'

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'test-key1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 302, 'correct statusCode')
      t.is(location, '/visit#' + val.url, 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('redirect to shown if origin not found', function (t) {
  var url = '/redirect?origin=0'

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 302, 'correct statusCode')
      t.end()
    })
  })
})

test.serial.cb('redirect to target url when geoState found', function (t) {
  var url = '/redirect?origin=1'
  var headers = { 'X-Forwarded-For': '134.201.250.155' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      geoState: {
        $in: ['CA']
      },
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 302, 'correct statusCode')
      t.is(location, '/visit#' + val.url, 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('redirect to shown if geoState not found', function (t) {
  var url = '/redirect?origin=1'
  var headers = { 'X-Forwarded-For': '146.79.254.10' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      geoState: {
        $in: ['LA']
      },
      origin: {
        $eq: '1'
      }
    }
  }

  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 302, 'correct statusCode')
      t.end()
    })
  })
})

test.serial.cb('flush before track last visit on target', function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('track last visit on target', function (t) {
  var url = '/redirect?origin=1'
  var headers = {
    'X-Forwarded-For': '146.79.254.10'
  }

  var opts = { method: 'GET', encoding: 'json', headers }
  var val1 = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      geoState: {
        $nin: ['LA']
      },
      origin: {
        $eq: '1'
      },
      nDaysLastSeenTarget: {
        $gt: 10
      }
    }
  }
  tk.freeze(new Date('2018-09-01'))
  Targets.put(val1, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var cookie = res.headers['set-cookie'] && res.headers['set-cookie'][0]
      var headers = {
        'X-Forwarded-For': '146.79.254.10',
        Cookie: cookie
      }
      var opts = { method: 'GET', encoding: 'json', headers }
      tk.freeze(new Date('2018-09-08'))
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var cookie = res.headers['set-cookie'] && res.headers['set-cookie'][0]
        var match = cookie && cookie.match(getPattern('arborist'))
        t.falsy(match, 'not store a cookie for track')
        t.is(res.statusCode, 302, 'correct statusCode')
        tk.reset()
        t.end()
      })
    })
  })
})

test.serial.cb('not accept target if last seen not appropriate', function (t) {
  var url = '/redirect?origin=1'
  var headers = {
    'X-Forwarded-For': '146.79.254.10'
  }

  var opts = { method: 'GET', encoding: 'json', headers }
  var val1 = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      geoState: {
        $nin: ['LA']
      },
      origin: {
        $eq: '1'
      },
      nDaysLastSeenTarget: {
        $gt: 3
      }
    }
  }
  tk.freeze(new Date('2018-09-01'))
  Targets.put(val1, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var cookie = res.headers['set-cookie'] && res.headers['set-cookie'][0]
      var headers = {
        'X-Forwarded-For': '146.79.254.10',
        Cookie: cookie
      }
      var opts = { method: 'GET', encoding: 'json', headers }
      tk.freeze(new Date('2018-09-08'))
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var cookie = res.headers['set-cookie'] && res.headers['set-cookie'][0]
        var match = cookie && cookie.match(getPattern('arborist'))
        t.truthy(match, 'store cookie')
        t.is(res.statusCode, 302, 'correct statusCode')
        tk.reset()
        t.end()
      })
    })
  })
})

test.serial.cb('not fail if arborist cookie is not json', function (t) {
  var url = '/redirect?origin=1'

  var headers = {
    'X-Forwarded-For': '146.79.254.10',
    Cookie: `arborist=${crypt.encrypt('blo', cookieCfg.encryptionKey)}`
  }

  var opts = { method: 'GET', encoding: 'json', headers }
  var val1 = {
    id: 'test-key',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      geoState: {
        $nin: ['LA']
      },
      origin: {
        $eq: '1'
      },
      nDaysLastSeenTarget: {
        $lt: 3
      }
    }
  }
  Targets.put(val1, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 302, 'correct statusCode')
      t.end()
    })
  })
})

test.serial.cb('populate url with target values /redirect', function (t) {
  var url = '/redirect?origin=1'

  var headers = {
    'X-Forwarded-For': '146.79.254.10'
  }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'c',
    url: 'https://domain.com/?subid={{endpoint}}',
    cpc: 0.9,
    maxAcceptsPerDay: 1,
    endpoint: 1000,
    accept: {
      geoState: {
        $nin: [
          'ak',
          'we'
        ]
      }
    }
  }
  var actualUrl = 'https://domain.com/?subid=1000'

  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 302, 'correct statusCode')
      t.is(location, '/visit#' + actualUrl, 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('should count traffic on redirect', function (t) {
  var url = '/redirect?origin=1'

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), '/api/targets/target1', opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.traffic, 1, 'traffic should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should not accept target twice a day if unique criteria exist',
  function (t) {
    var url = '/redirect?origin=1'

    var opts = { method: 'GET', encoding: 'json' }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        origin: {
          $eq: '1'
        },
        uniqueDailyIP: {
          $eq: true
        }
      }
    }
    Targets.put(val, function (err) {
      t.falsy(err, 'no error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.body.redirect, '/visit#http://ss.com', 'redirect to /visit')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.not(res.body.redirect, '/visit#http://ss.com', 'not redirect to /visit')
          t.end()
        })
      })
    })
  })

test.serial.cb('should visit origin postback', function (t) {
  var url = '/redirect?origin=origin1'

  var opts = { method: 'GET', encoding: 'json' }
  var inspect = stdout.inspect()

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: 'origin1'
      },
      uniqueDailyIP: {
        $eq: true
      }
    }
  }

  const constOrigin = {
    id: 'origin1',
    originPixel: 'origin.com'
  }

  const publisher = {
    id: 'pub1',
    origins: { origin1: { id: 'origin1' } }
  }

  Publishers.put(publisher, function (err) {
    t.falsy(err, 'no error')

    Origins.put(constOrigin, function (err) {
      t.falsy(err, 'no error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.redirect, '/visit#http://ss.com', 'redirect to /visit')
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            inspect.restore()
            var containsPixelUrl = !!inspect.output.find(out => out.includes('originPixelUrl'))
            t.not(res.body.redirect, '/visit#http://ss.com', 'not redirect to /visit')
            t.true(containsPixelUrl, 'not redirect to /visit')
            t.end()
          })
        })
      })
    })
  })
})

test.serial.cb('should create event for visit revenue for route', function (t) {
  var opts = { method: 'POST', encoding: 'json' }
  var val2 = {
    id: '12s',
    url: 'https://www.test.com/?&sss2={{requestId}}',
    accept: {
      geoState: {
        $in: ['ak', 'ny']
      }
    }
  }
  var constPublisher = {
    id: 'dddd'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val2, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        tier: '0.5',
        publisher: 'dddd'
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit')[2]
        t.is(res.body.decision, 'accept', 'should accept visitor')
        url = `/visit/${requestId}`
        opts = { method: 'GET', encoding: 'json' }
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          var visitId = res.body.redirect.split('sss2=')[1]
          t.truthy(`/${visitId}`, 'ids should match')
          opts = { method: 'GET', encoding: 'json' }
          url = `/visit-revenue?visitId=${visitId}&revenue=${300}`
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.message, 'ok', 'message should match')
            t.end()
          })
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should not call external APIs if noExternalCalls param is sent in the request to /redirect',
  function (t) {
    var url = '/redirect?origin=1&noExternalCalls=true'

    var opts = { method: 'GET', encoding: 'json' }

    var val2 = {
      id: '12s',
      url: 'https://www.test.com/?&sss2={{requestId}}',
      accept: {
        geoState: {
          $in: ['ak', 'ny']
        }
      }
    }

    Targets.put(val2, function (err) {
      t.falsy(err, 'should not error')
      var inspect = stdout.inspect()
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        inspect.restore()
        var containsCheckNathan = !!inspect.output.find(out => out.includes('nathan'))
        var containsCheckRatespecial = !!inspect.output.find(out => out.includes('ratespecial'))
        var containsOLP = !!inspect.output.find(out => out.includes('OLP'))
        var containsPrediction50 = !!inspect.output.find(out => out.includes('prediction50'))
        t.is(containsCheckNathan, false, 'should not contain Nathan response')
        t.is(containsCheckRatespecial, false, 'should not contain Ratespecial response')
        t.is(containsOLP, false, 'should not contain OLP response')
        t.is(containsPrediction50, false, 'should not contain Prediction50 response')
        t.end()
      })
    })
  })

test.serial.cb('should create event for visit revenue for redirect', function (t) {
  var opts = { method: 'GET', encoding: 'json' }
  var val2 = {
    id: '12s',
    url: 'https://www.test.com/?&sss2={{requestId}}',
    accept: {
      geoState: {
        $nin: ['UT']
      }
    }
  }
  var constPublisher = {
    id: 'dddd'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(val2, function (err) {
      t.falsy(err, 'should not error')
      var url = '/redirect?ip=64.186.123.21&tier=0.5&publisher=dddd'
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        opts = { method: 'GET', encoding: 'json' }
        var visitId = res.body.redirect.split('sss2=')[1]

        url = `/visit-revenue?visitId=${visitId}&revenue=${300}`
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.message, 'ok', 'message should match')
          t.end()
        })
      })
    })
  })
})

test.serial.cb('should not call external APIs if origin\'s property noExternalRequests is true in the request to /redirect', function (t) {
  var url = '/redirect?origin=origin1'

  var opts = { method: 'GET', encoding: 'json' }
  const constOrigin = {
    id: 'origin1',
    noExternalRequests: true
  }
  Origins.put(constOrigin, function (err) {
    t.falsy(err, 'should not error')
    var inspect = stdout.inspect()
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      inspect.restore()
      var containsCheckNathan = !!inspect.output.find(out => out.includes('nathan'))
      var containsCheckRatespecial = !!inspect.output.find(out => out.includes('ratespecial'))
      var containsOLP = !!inspect.output.find(out => out.includes('OLP'))
      var containsPrediction50 = !!inspect.output.find(out => out.includes('prediction50'))
      t.is(containsCheckNathan, false, 'should not contain Nathan response')
      t.is(containsCheckRatespecial, false, 'should not contain Ratespecial response')
      t.is(containsOLP, false, 'should not contain OLP response')
      t.is(containsPrediction50, false, 'should not contain Prediction50 response')
      t.end()
    })
  })
})

test.serial.cb('should accept target based on device on /redirect', function (t) {
  var url = '/redirect?origin=1'
  var headers = { 'user-agent': 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      },
      uniqueDailyIP: {
        $eq: true
      },
      device: {
        $eq: 'mobile'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.redirect, '/visit#http://ss.com', 'redirect to /visit')
      t.end()
    })
  })
})

test.serial.cb('should set the requestType to ping tree in the request to /route', function (t) {
  var url = '/route'

  var opts = { method: 'POST', encoding: 'json' }
  var visitor = {
    ip: '64.186.123.21',
    tier: '0.5',
    publisher: 'pub1',
    origin: '1',
    noExternalCalls: true
  }
  const publisher = {
    id: 'pub1'
  }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      },
      requestType: {
        $eq: 'ping tree'
      }
    }
  }
  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(val, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res.statusCode, 200, 'should be ok')
        t.end()
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should set the requestType to web in the request to /redirect', function (t) {
  var url = '/redirect?origin=1'

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      },
      requestType: {
        $eq: 'web'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.redirect, '/visit#http://ss.com', 'redirect to /visit')
      t.end()
    })
  })
})

test.serial.cb('pass ad\'s value to /visit opts on redirect', function (t) {
  var url = '/redirect?origin=1'

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'test-key1',
    adParams: {
      duration: 10000,
      text: 'greetings'
    },
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 302, 'correct statusCode')
      t.is(location, '/visit?duration=10000&text=greetings#http://ss.com', 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('pass ad\'s value to /visit opts on visit', function (t) {
  var requestId = 'ck1ikg6yu0000zk8giiqxtpv2'
  var url = `/visit/${requestId}?wow=wow`

  var opts = { method: 'GET', encoding: 'json' }

  Targets.putTargetUrl({
    id: requestId,
    target: {
      id: 'test-key1',
      url: 'http://ss.com?param2=22'
    }
  }, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 301, 'correct statusCode')
      t.deepEqual(URL.parse(location, true).query, { requestId, wow: 'wow', param2: '22' }, 'query should match') // eslint-disable-line
      t.end()
    })
  })
})

test.serial.cb('should save ip last seen on /redirect', function (t) {
  var ip = '64.186.123.21&'
  var url = `/redirect?ip=${ip}origin=1`
  tk.freeze(new Date('2018-10-13'))

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'test-key1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err) {
      t.falsy(err, 'should not error')
      IpAddressLastAccept.get('127.0.0.1', function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res, '2018-10-13', 'dates should match')
        tk.reset()
        t.end()
      })
    })
  })
})

test.serial.cb('query params from request should be high priority ', function (t) {
  var requestId = 'ck1ikg6yu0000zk8giiqxtpv2'
  var url = `/visit/${requestId}?wow=wow`

  var opts = { method: 'GET', encoding: 'json' }

  Targets.putTargetUrl({
    id: requestId,
    target: {
      id: 'test-key1',
      url: 'http://ss.com?wow=22'
    }
  }, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      var location = res.headers.location
      t.is(res.statusCode, 301, 'correct statusCode')
      t.deepEqual(URL.parse(location, true).query, { requestId, wow: 'wow' }, 'query should match') // eslint-disable-line
      t.end()
    })
  })
})

test.serial.cb('should accept target on stopgo present on /redirect', function (t) {
  var url = '/redirect?origin=1'
  var headers = { 'user-agent': 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      },
      stopgoPresent: {
        $eq: true
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.redirect, '/visit#http://ss.com', 'redirect to /visit')
      t.end()
    })
  })
})

test.serial.cb('should get right impressions on redirect for score', function (t) {
  var date = '2019-03-14'
  tk.freeze(new Date(date))
  var url = '/redirect?origin=222'
  var headers = { 'user-agent': 'Mozilla/5.0 (Linux; U; Android 2.2) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1' }

  var opts = { method: 'GET', encoding: 'json', headers }

  var target1 = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '222'
      }
    }
  }
  var target2 = {
    id: 'target2',
    some: 'test object',
    url: 'ssshttp://ss.com',
    accept: {
      origin: {
        $eq: '222'
      }
    }
  }
  var publisher = { id: 'publisher1', origins: { 222: { name: 'origin22' } } }
  Publishers.put(publisher, function (err) {
    t.falsy(err, 'no error')

    Targets.put(target1, function (err) {
      t.falsy(err, 'no error')
      Targets.put(target2, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'no error')
          t.is(res.headers.location, '/visit#' + target1.url, 'urls should match')

          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'no error')
            t.is(res.headers.location, '/visit#' + target1.url, 'urls should match')

            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'no error')
              t.is(res.headers.location, '/visit#' + target2.url, 'urls should match')
              t.end()
            })
          })
        })
      })
    })
  })
})

test.serial.cb('should get right impressions on redirect for score with preserve referrer',
  function (t) {
    var url = '/redirect?origin=test'
    var opts = { method: 'GET', encoding: 'json' }

    var target = targetFactory({
      preserveReferrer: true,
      accept: {
        origin: {
          $in: [
            'test'
          ]
        }
      }
    })

    var publisher = {
      id: 'pub1',
      origins: {
        test: {
          name: 'test'
        }
      }
    }

    Publishers.put(publisher, function (err) {
      t.falsy(err, 'no error')

      Targets.put(target, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'no error')
          t.is(res.headers.location.includes('visit#'), false, 'no hash in the redirect location')
          t.is(res.headers.location, target.url, 'urls should match')
          t.end()
        })
      })
    })
  })

test.serial.cb('should use origin`s arbitrary params instead of incoming params', function (t) {
  var opts = { method: 'GET', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'http://example.c',
    accept: {
      tier: { $lt: 0.8 }
    }
  }

  var val2 = {
    id: '12',
    url: 'http://example.com12/',
    accept: {
      tier: { $lt: 0.5 }
    }
  }

  var originEntity = {
    id: 'origin1',
    arbitraryParams: {
      param1: 15,
      tier: 0.3
    }
  }

  var constPublisher = {
    id: 'publisher1'
  }
  var url = '/redirect?origin=origin1&tier=0.6'

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')
    Origins.put(originEntity, function (err) {
      t.falsy(err, 'no error')

      Targets.put(val1, function (err) {
        t.falsy(err, 'should not error')
        Targets.put(val2, function (err) {
          t.falsy(err, 'should not error')
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.headers.location, '/visit#' + val2.url, 'urls should match')
            originEntity.arbitraryParams.tier = 0.6

            Origins.put(originEntity, function (err) {
              t.falsy(err, 'should not error')
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                t.is(res.headers.location, '/visit#' + val1.url, 'urls should match')
                t.end()
              })
            })
          })
        })
      })
    })
  })
})

test.serial.cb('should handle showm3Redirect', function (t) {
  var opts = { method: 'GET', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'http://example.c',
    accept: {
      typId: { $in: ['3ab9a49350-df4b45aef1-b3724a213b-497e855ee7'] }
    }
  }

  var url = '/product.php?id=3ab9a49350-df4b45aef1-b3724a213b-497e855ee7'
  Targets.put(val1, function (err) {
    t.falsy(err, 'should not error')

    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')

      t.is(res.headers.location, '/visit#' + val1.url, 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('should handle showm3Redirect via origin lookup', function (t) {
  var opts = { method: 'GET', encoding: 'json' }
  var val1 = {
    id: 'c',
    url: 'http://example.c',
    accept: {
      origin: { $in: ['1042'] }
    }
  }

  var url = '/product.php?id=3ab9a49350-df4b45aef1-b3724a213b-497e855ee7'
  Targets.put(val1, function (err) {
    t.falsy(err, 'should not error')

    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')

      t.is(res.headers.location, '/visit#' + val1.url, 'urls should match')
      t.end()
    })
  })
})

test.serial.cb('should create event for visit revenue for route with template url', function (t) {
  var opts = { method: 'POST', encoding: 'json' }
  var visitorDomain = 'another-domain'
  var target = targetFactory({
    url: 'https://domain.com/',
    template: 'https://{{domain}}.com/',
    accept: {
      origin: {
        $eq: 'origin1'
      }
    }
  })
  var constPublisher = {
    id: 'dddd'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        tier: '0.5',
        publisher: 'dddd',
        origin: 'origin1',
        domain: visitorDomain
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        t.is(res.body.decision, 'accept', 'should accept visitor')
        url = `/visit/${requestId}`
        opts = { method: 'GET', encoding: 'json' }
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.redirect, `https://${visitorDomain}.com/?requestId=${requestId}`, 'match url')
          t.end()
        })
      })
        .end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should record leadSold event in DB', function (t) {
  var time1 = '2020-06-29T19:52:54.182Z'
  var time2 = '2020-06-30T19:52:54.182Z'
  tk.freeze(time1)
  var opts = { method: 'POST', encoding: 'json' }
  var visitorDomain = 'another-domain'
  var target = targetFactory({
    url: 'https://domain.com/',
    template: 'https://{{domain}}.com/',
    accept: {
      origin: {
        $eq: 'origin1'
      }
    }
  })
  var constPublisher = {
    id: 'dddd'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        tier: '0.5',
        publisher: 'dddd',
        origin: 'origin1',
        domain: visitorDomain
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        url = `/visit/${requestId}`
        opts = { method: 'GET', encoding: 'json' }
        servertest(server(), url, opts, function (err) {
          t.falsy(err, 'should not error')
          url = `/pixel-event?requestId=${requestId}&eventType=leadSold&price=1.6`
          tk.freeze(time2)
          servertest(server(), url, opts, function (err, res) {
            t.falsy(err, 'should not error')
            t.is(res.body.message, 'ok', 'should record the event')
            servertest(server(), url, opts, function (err, res) {
              t.falsy(err, 'should not error')
              t.is(res.body.error, 'requestId missing or already used',
                'should decline the second request with the same requestId and eventType')
              url = '/reports?dateStart=2020-06-30&dateEnd=2020-06-30&isShorten=true'
              servertest(server(), url, opts, function (err, res) {
                t.falsy(err, 'should not error')
                var leadSold = res.body.filter(event => event.type === 'leadSold')
                console.log({ leadSold })
                t.is(leadSold.length, 2, 'the number of leadSold events should match')
                t.is(leadSold[0].publisher, 'dddd', 'the publisher param should match')
                t.is(leadSold[0].price, '1.6', 'the price param should match')
                t.is(leadSold[0].timestamp, time2, 'the timestamp param should match')
                propertiesToExclude.forEach(prop => {
                  t.is(leadSold[0][prop], undefined)
                })
                tk.reset()
                t.end()
              })
            })
          })
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should store interstitial on /pixel-event', function (t) {
  var time1 = '2020-06-29T19:52:54.182Z'
  var time2 = '2020-06-30T19:52:54.182Z'
  tk.freeze(time1)
  var opts = { method: 'POST', encoding: 'json' }
  var visitorDomain = 'another-domain'
  var target = targetFactory({
    url: 'https://domain.com/',
    template: 'https://{{domain}}.com/',
    accept: {
      origin: {
        $eq: 'origin1'
      }
    }
  })
  var constPublisher = {
    id: 'dddd'
  }

  Publishers.put(constPublisher, function (err) {
    t.falsy(err, 'should not error')

    Targets.put(target, function (err) {
      t.falsy(err, 'should not error')
      var url = '/route'
      var visitor = {
        ip: '64.186.123.21',
        tier: '0.5',
        publisher: 'dddd',
        origin: 'origin1',
        domain: visitorDomain
      }
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')
        var requestId = res.body.url.split('visit/')[1]
        url = `/pixel-event?requestId=${requestId}&eventType=initiateInter&price=1.6&interstitial=page1`
        tk.freeze(time2)
        opts = { method: 'GET', encoding: 'json' }
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.message, 'ok', 'should record the event')
          dateRangeReport({ dateStart: '2020-06-30', dateEnd: '2020-06-30' },
            function (err, res) {
              t.falsy(err, 'should not error')
              var inters = res.filter(event => event.type === 'initiateInter')
              t.is(inters.length, 1, 'the number of inters events should match')
              t.is(inters[0].interstitial, 'page1', 'the interstitial param should match')
              tk.reset()
              t.end()
            })
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

test.serial.cb('should return error if /pixel-event gets wrong eventType param',
  function (t) {
    var opts = { method: 'GET', encoding: 'json' }
    var url = '/pixel-event?requestId=11111&eventType=view_content'

    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.statusCode, 400, 'correct statusCode')
      t.is(res.body.error, 'eventType is not in the list', 'should send error message')
      t.end()
    })
  })

test.serial.cb('should record wrong eventType param on /pixel-event', function (t) {
  var opts = { method: 'GET', encoding: 'json' }
  var url = '/pixel-event?requestId=11111&eventType=view_content'

  tk.freeze('2020-09-29')

  servertest(server(), url, opts, function (err) {
    t.falsy(err, 'should not error')

    dateRangeReport({ dateStart: '2020-09-29', dateEnd: '2020-09-30' },
      function (err, res) {
        t.falsy(err, 'should not error')
        t.is(res[0].type, 'view_content', 'correct event type')
        tk.reset()
        t.end()
      })
  })
})

test.serial.cb('should record event without event type on /pixel-event',
  function (t) {
    var opts = { method: 'GET', encoding: 'json' }
    var url = '/pixel-event?requestId=2222'

    tk.freeze('2020-09-28')

    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.error, 'requestId and eventType parameters are required', 'correct error')

      dateRangeReport({ dateStart: '2020-09-28', dateEnd: '2020-09-28' },
        function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res[0].requestId, '2222', 'correct requestId')
          tk.reset()
          t.end()
        })
    })
  })

test.serial.cb('return specific target based on origin params', function (t) {
  var affsubValue = 'qwer'
  var url = `/redirect?origin=1&affsub=${affsubValue}`
  var time1 = '2020-06-23T19:52:54.182Z'
  tk.freeze(time1)

  var opts = { method: 'GET', encoding: 'json' }

  var val = {
    id: 'test-key1',
    some: 'test object',
    url: 'http://ss.com',
    accept: {
      origin: {
        $eq: '1'
      }
    }
  }

  Targets.put(val, function (err) {
    t.falsy(err, 'no error')
    servertest(server(), url, opts, function (err) {
      t.falsy(err, 'should not error')
      dateRangeReport({ dateStart: '2020-06-23', dateEnd: '2020-06-23' },
        function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res[0].subid, affsubValue, 'subid value should match affsubValue')
          tk.reset()
          t.end()
        })
    })
  })
})

test.serial.cb('should get geoStateFull in web type traffic', function (t) {
  var url = '/redirect?origin=or1'

  var opts = { method: 'GET', encoding: 'json' }
  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com?origin={{origin}}&geoStateFull={{geoStateFull}}',
    accept: {
      origin: {
        $eq: 'or1'
      },
      requestType: {
        $eq: 'web'
      }
    }
  }
  Targets.put(val, function (err) {
    t.falsy(err, 'should not error')
    servertest(server(), url, opts, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.redirect, '/visit#http://ss.com?origin=or1&geoStateFull=StateFull', 'redirect to /visit')
      t.end()
    })
  })
})

test.serial.cb('should get geoStateFull in ping tree type traffic', function (t) {
  var url = '/route'

  var opts = { method: 'POST', encoding: 'json' }
  var publisher = {
    id: 'pub1'
  }
  var visitor = {
    ip: '127.0.0.1',
    tier: '0.5',
    publisher: publisher.id,
    origin: 'or1',
    noExternalCalls: true
  }

  var val = {
    id: 'target1',
    some: 'test object',
    url: 'http://ss.com?origin={{origin}}&?geoStateFull={{geoStateFull}}',
    accept: {
      origin: {
        $eq: 'or1'
      },
      requestType: {
        $eq: 'ping tree'
      }
    }
  }
  Publishers.put(publisher, function (err) {
    t.falsy(err, 'should not error')
    Targets.put(val, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, opts, function (err, res) {
        t.falsy(err, 'should not error')

        t.is(res.body.decision, 'accept')

        var requestId = res.body.url.split('#')[1].split('/')[4]
        url = '/visit/' + requestId

        servertest(server(), url, { method: 'GET', encoding: 'json' }, function (err, res) {
          t.falsy(err, 'Should not error')

          var expected = 'http://ss.com/?requestId=' + requestId + '&origin=or1&%3FgeoStateFull=StateFull'
          t.is(res.body.redirect, expected, 'correct redirect url')
          t.end()
        })
      }).end(JSON.stringify(visitor))
    })
  })
})

function getPattern (name) {
  return new RegExp(
    '(?:^|;) *' +
    name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') +
    '=([^;]*)'
  )
}

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
