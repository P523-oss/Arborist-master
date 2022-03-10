var test = require('ava')
var servertest = require('servertest')

var server = require('../../lib/server')

test.cb('echo', function (t) {
  var url = '/echo'
  var body = {
    ip: '64.186.123.21',
    tier: '0.5',
    publisher: 'dddd'
  }
  servertest(server(), url, { encoding: 'json', method: 'POST' }, function (err, res) {
    t.falsy(err, 'no error')
    t.deepEqual(res.body, body, 'response body should equal request body')
    t.end()
  }).end(JSON.stringify(body))
})

test.cb('criteria', function (t) {
  var url = '/api/utils/criteria'
  servertest(server(), url, { encoding: 'json', method: 'GET' }, function (err, res) {
    t.falsy(err, 'no error')
    t.deepEqual(Object.keys(res.body).length, 4, 'match number')
    t.end()
  })
})
