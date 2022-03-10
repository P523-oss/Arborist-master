var test = require('ava')
var servertest = require('servertest')

var EXTERNAL_REQUEST_LIST = require('../../lib/utils/external-request-list')
var server = require('../../lib/server')
var db = require('../../lib/db')
var Publishers = require('../../lib/models/publisher')
var Targets = require('../../lib/models/targets')

var publisherId = '124124'
var constPublisher = {
  id: publisherId
}

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.cb('should list requests', function (t) {
  var url = '/api/external-request'

  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'should not error')
    t.deepEqual(res.body.map(t => t.id),
      EXTERNAL_REQUEST_LIST, 'response length should match')
    t.end()
  })
})

test.serial.cb('should put values', function (t) {
  var val = {
    id: 'stopgo',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    url = 'api/external-request/stopgo'
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'should not error')
      t.is(res.body.disabled, true, 'correct statusCode')
      t.end()
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get nathan`s data if nathan is on pause', function (t) {
  var val = {
    id: 'responseNathan',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        nathanSellPrice: { $gt: 3 }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get jordan`s data if jordan is on pause', function (t) {
  var val = {
    id: 'jordan',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        jordanAge: { $gt: 3 }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get ItMedia`s data if it is on pause', function (t) {
  var val = {
    id: 'itMediaCheck',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        itMediaCheck: { $eq: 'ok' }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get leadsmarket`s data if it is on pause', function (t) {
  var val = {
    id: 'leadsmarket',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:70.0) Gecko/20100101 Firefox/70.0'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        leadsmarketWillPurchase: { $eq: true }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get stopgo`s data if it is on pause', function (t) {
  var val = {
    id: 'stopgo',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:70.0) Gecko/20100101 Firefox/70.0'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        stopgoAge: { $gt: 3 }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should not get olp`s data if it is on pause', function (t) {
  var val = {
    id: 'olp',
    disabled: true
  }
  var url = '/api/external-request'
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')

    var url = '/route'
    var opts = { method: 'POST', encoding: 'json' }
    var visitor = {
      ip: '64.186.123.21',
      tier: '0.5',
      publisher: constPublisher.id,
      origin: 'origin1'
    }

    var val = {
      id: 'target1',
      some: 'test object',
      url: 'http://ss.com',
      accept: {
        olpEmails: { $eq: 0 }
      }
    }

    Publishers.put(constPublisher, function (err) {
      t.falsy(err, 'should not error')

      Targets.put(val, function (err) {
        t.falsy(err, 'no error')
        servertest(server(), url, opts, function (err, res) {
          t.falsy(err, 'should not error')
          t.is(res.body.decision, 'reject', 'decision should match')
          t.end()
        })
          .end(JSON.stringify(visitor))
      })
    })
  }).end(JSON.stringify(val))
})
