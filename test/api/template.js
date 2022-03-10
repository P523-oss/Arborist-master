var test = require('ava')
var servertest = require('servertest')
var _ = require('lodash')

var Templates = require('../../lib/models/templates')
var Targets = require('../../lib/models/targets')
var server = require('../../lib/server')
var db = require('../../lib/db')

test.beforeEach.cb(function (t) {
  db.FLUSHDB(t.end)
})

test.serial.cb('should list templates', function (t) {
  var url = '/api/templates'
  var val1 = {
    id: 'template',
    value: 'http://{{domain}}/?subid={{campaignId}}&subid2={{source}}'
  }

  var val2 = {
    id: 'template2',
    value: 'http://{{domain}}/?subid={{campaignId}}&subid2={{source}}'
  }

  Templates.put(val1, function (err) {
    t.falsy(err, 'should not error')
    Templates.put(val2, function (err) {
      t.falsy(err, 'should not error')
      servertest(server(), url, { encoding: 'json' }, function (err, res) {
        t.falsy(err, 'should not error')
        t.deepEqual(res.body.map(t => t.id),
          ['template', 'template2'], 'response length should match')
        t.end()
      })
    })
  })
})

test.serial.cb('should get template', function (t) {
  var val = {
    id: 'template1',
    value: 'http://{{domain}}/?subid={{campaignId}}&subid2={{source}}'
  }

  Templates.put(val, function (err, template) {
    t.falsy(err, 'no error')
    var url = `/api/templates/${template.id}`
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')

      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.value, val.value, 'value should match')
      t.true(!_.isUndefined(res.body.createdAt), 'createdAt should exist')
      t.true(!_.isUndefined(res.body.modifiedAt), 'modifiedAt should exist')
      t.end()
    })
  })
})

test.serial.cb('should put values', function (t) {
  var val = {
    id: 'template1',
    value: 'http://{{domain}}/?subid={{campaignId}}&subid2={{source}}'
  }
  var url = `/api/templates/${val.id}`
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    Templates.get(res.body.id, function (err, template) {
      t.falsy(err, 'no error')
      t.true(!_.isUndefined(template.modifiedAt), 'modifiedAt should exist')
      t.end()
    })
  }).end(JSON.stringify(val))
})

test.serial.cb('should update associated targets when template change', function (t) {
  var template = {
    id: 'template1',
    value: 'http://{{domain}}/?subid={{campaignId}}&subid2={{source}}'
  }
  var target = {
    id: 'target11',
    template: template.value,
    templateId: template.id
  }
  var url = `/api/templates/${template.id}`
  var opts = { method: 'POST', encoding: 'json' }
  servertest(server(), url, opts, function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    Targets.put(target, function (err) {
      t.falsy(err, 'no error')
      template.value = 'http://{{domain}}'
      servertest(server(), url, opts, function onResponse (err) {
        t.falsy(err, 'no error')
        Targets.get(target.id, function (err, target2) {
          t.falsy(err, 'no error')
          t.is(target2.template, 'http://{{domain}}', 'match new template')
          t.end()
        })
      }).end(JSON.stringify(template))
    })
  }).end(JSON.stringify(template))
})

test.cb('should not save template if value is not valid', function (t) {
  var opts = { method: 'POST', encoding: 'json' }
  var template = {
    id: 'template1',
    value: 'https://path.money/?origin={{origin}}_{{endpoint}'
  }
  var url = `/api/templates/${template.id}`

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.body.error, 'template URL\'s brackets validation failed')
    t.end()
  })
    .end(JSON.stringify(template))
})

test.cb('should not save template if checker for template value failed', function (t) {
  var opts = { method: 'POST', encoding: 'json' }
  var template = {
    id: 'template1',
    value: 'path.money/?origin={{origin}}_{{endpoint}'
  }
  var url = `/api/templates/${template.id}`

  servertest(server(), url, opts, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.body.error, 'template value is not valid')
    t.end()
  })
    .end(JSON.stringify(template))
})
