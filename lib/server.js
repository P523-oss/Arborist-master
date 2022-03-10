var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var async = require('async')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var db = require('./db')
var {
  utility, targets, publishers, externalRequest,
  advertisers, origins, targetRateHistory, template,
  reports, redirect, route, ruleSet, rejectOriginSubid, advertiserReport
} = require('./api')
var authify = require('./authify')
var version = require('../package.json').version
var multilevel = require('./multilevel')
var defaultHtml = require('./default-html')

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, function (cb) {
  async.parallel([
    db.healthCheck,
    multilevel.healthCheck
  ], cb)
})
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

router.set('/favicon.ico', empty)
router.set('/', defaultPage)
router.set('/api/targets', {
  GET: authify(targets.listTargets),
  POST: authify(targets.putTarget)
})
router.set('/api/targets/:id', {
  GET: authify(targets.getTarget)
})

router.set('/api/targets-history/:id', {
  GET: authify(targets.getTargetHistory)
})
router.set('/api/publishers', {
  GET: authify(publishers.listPublishers),
  POST: authify(publishers.putPublisher)
})
router.set('/api/publishers/:id', {
  GET: authify(publishers.getPublisher)
})
router.set('/api/advertisers', {
  GET: authify(advertisers.listAdvertisers, { allowAuthenticated: true }),
  POST: authify(advertisers.putAdvertiser)
})
router.set('/api/advertisers/:id', {
  GET: authify(advertisers.getAdvertiser)
})

router.set('/api/rule-set', {
  GET: authify(ruleSet.listRuleSets),
  POST: authify(ruleSet.putRuleSet)
})
router.set('/api/rule-set/:id', {
  GET: authify(ruleSet.getRuleSet)
})

router.set('/api/origins', {
  GET: authify(origins.listOrigins),
  POST: authify(origins.putOrigin)
})

router.set('/api/origins/:id', {
  GET: authify(origins.getOrigin),
  POST: authify(origins.putOrigin),
  DELETE: authify(origins.removeOrigin)
})

router.set('/api/external-request/:name', {
  GET: authify(externalRequest.get)
})

router.set('/api/external-request', {
  GET: authify(externalRequest.list),
  POST: authify(externalRequest.put)
})

router.set('/api/reject-origin-subid-list', {
  GET: authify(rejectOriginSubid.listReject),
  POST: authify(rejectOriginSubid.putOriginSubid)
})

router.set('/api/reject-origin-subid-list/:id', {
  GET: authify(rejectOriginSubid.getOriginSubid),
  DELETE: authify(rejectOriginSubid.deleteOriginSubid)
})

router.set('/api/target-rate-history', {
  GET: authify(targetRateHistory.getTargetRateHistory),
  POST: authify(targetRateHistory.putTargetRateHistory)
})

router.set('/api/utils/criteria', {
  GET: authify(utility.criteria)
})

router.set('/route', {
  POST: route.decide
})

router.set('/echo', {
  POST: utility.echo
})

router.set('/reports', {
  GET: authify(reports.getReports)
})

router.set('/reports-data', {
  GET: authify(reports.getReportsWithCalculation)
})
router.set('/redirect', { GET: redirect.targetRedirect })
router.set('/visit', { GET: redirect.jsVisit })
router.set('/visit/:requestId', { GET: redirect.visit })

router.set('/visit-revenue', redirect.visitRevenue)
router.set('/pixel-event', redirect.recordPixelEvent)

router.set('/account-click-impression', {
  GET: authify(advertisers.getClickImpression)
})

router.set('/get-request-id-info/:id', {
  GET: authify(reports.getRequestIdInfo)
})

router.set('/api/templates', {
  GET: authify(template.listTemplates)
})

router.set('/api/templates/:id', {
  GET: authify(template.getTemplate),
  POST: authify(template.putTemplate)
})

router.set('/api/advertiser-report', {
  POST: advertiserReport.trigger,
  GET: authify(advertiserReport.get, { allowAuthenticated: true })
})

router.set('/product.php', {
  GET: redirect.showm3Redirect
})

module.exports = function createServer () {
  var server = http.createServer(cors(handler))
  server.keepAliveTimeout = 10 * 60 * 1000
  server.headersTimeout = 11 * 60 * 1000
  return server
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  if (req.url === '/test.php') return health(req, res)
  req.id = cuid()

  var reqInfo = {
    requestId: req.id,
    contentType: req.headers['content-type']
  }

  logger(req, res, reqInfo, function (info) {
    info.authEmail = (req.auth || {}).email
    info.isAccept = !!req.isAccept
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}

function defaultPage (req, res) {
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(defaultHtml({ host: req.headers.host }))
}
