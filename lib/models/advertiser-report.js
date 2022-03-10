var async = require('async')
var _ = require('lodash')
var { fs, vol } = require('memfs')
var { Storage } = require('@google-cloud/storage')
var xtend = require('xtend')
var PathKey = require('pathkey')
var pk = PathKey({
  pathKey: '_path',
  pathSep: '/',
  keySep: '\xff'
})

var getTargetHistory = require('./target-rate-history').get
var config = require('../../config').gcs
var Advertiser = require('./advertisers')
var Targets = require('./targets')

var bucket = config.bucket
var testDir = '/test'
var IS_TEST = process.env.NODE_ENV === 'test'

var GCS_PATH = (advertiserId, date) => {
  var path = date.replace(/-/g, '/')
  return `advertiserStats/${advertiserId}/${path}.json`
}
var FS_PATH = (advertiserId, date) => {
  var path = date.replace(/-/g, '_')
  return `${testDir}/advertiserStats_${advertiserId}_${path}.json`
}

var storage = new Storage({
  projectId: config.project,
  credentials: config.creds
})

var myBucket = storage.bucket(bucket)

module.exports = {
  store,
  retrieve
}

function store ({ advertiserId, date }, cb) {
  getDataForAdvertiser({ advertiserId, date }, function (err, stats) {
    if (err) return cb(err)

    var storeStats = IS_TEST
      ? storeStatsTest
      : storeStatsInGCS
    storeStats({ advertiserId, date, stats }, cb)
  })
}

function retrieve ({ advertiserId, date }, cb) {
  var IS_TODAY = date === new Date().toISOString().split('T')[0]
  var retrieveStatsFromDB = IS_TODAY
    ? retrieveStatsFromRedis
    : retrieveStatsFromGCS

  var retrieveStatsFromDBTest = IS_TODAY
    ? retrieveStatsFromRedis
    : retrieveStatsTest

  var retrieveStats = IS_TEST
    ? retrieveStatsFromDBTest
    : retrieveStatsFromDB
  retrieveStats({ advertiserId, date }, cb)
}

function getDataForAdvertiser ({ advertiserId, date }, cb) {
  Targets.getEventCount({ advertiserId, date }, function (err, traffic) {
    if (err) return cb(err)

    var allStats = []
    _.forOwn(traffic, function (count, key) {
      var stats = pk.parse(key)
      allStats.push(xtend(stats, { date, count }))
    })

    async.map(
      allStats,
      getDataForTarget,
      cb
    )
  })
}

function getDataForTarget (stats, cb) {
  getTargetHistory({ targetId: stats.targetId, date: stats.date }, function (err, body) {
    if (err) return cb(err)

    Targets.get(stats.targetId, function (err, target) {
      if (err) return cb(err)

      var targetInfo = _.isEmpty(body) ? target : body
      var rateAmount = (targetInfo || {}).rateAmount
      var offer = target.offer

      cb(null, xtend(stats, { rateAmount, offer, revenue: stats.count * rateAmount }))
    })
  })
}

function storeStatsInGCS ({ advertiserId, date, stats }, cb) {
  var path = GCS_PATH(advertiserId, date)
  var file = myBucket.file(path)

  file.createWriteStream()
    .on('error', cb)
    .on('finish', cb)
    .end(JSON.stringify(stats))
}

function storeStatsTest ({ advertiserId, date, stats }, cb) {
  if (!vol.existsSync(testDir)) vol.mkdirSync(testDir)

  var path = FS_PATH(advertiserId, date)

  fs.createWriteStream(path)
    .on('error', cb)
    .on('finish', cb)
    .end(JSON.stringify(stats))
}

function retrieveStatsFromGCS ({ advertiserId, date }, cb) {
  var path = GCS_PATH(advertiserId, date)
  var file = myBucket.file(path)
  var chunks = []

  file.createReadStream()
    .on('error', function (err) {
      if (err.message.split(':')[0] !== 'No such object') return cb(err)

      cb()
    })
    .on('data', data => chunks.push(data))
    .on('end', () => addOfferOnPreviousreports(
      JSON.parse(Buffer.concat(chunks)), cb))
}

function addOfferOnPreviousreports (gcsReports, cb) {
  async.map(_.flatten(gcsReports), addOfferOnReport, cb)
}

function addOfferOnReport (report, cb) {
  Targets.get(report.targetId, function (err, target) {
    if (err) return cb(err)

    report.offer = target.offer
    cb(null, report)
  })
}

function retrieveStatsFromRedis ({ advertiserId, date }, cb) {
  Advertiser.get(advertiserId, function (err, advertiser) {
    if (err) return cb(err)

    if (!advertiser) return cb(new Error(`No advertiser with id = ${advertiserId}`))

    getDataForAdvertiser({ advertiserId, date }, cb)
  })
}

function retrieveStatsTest ({ advertiserId, date }, cb) {
  var chunks = []

  if (!vol.existsSync(testDir)) return cb(new Error(`No ${testDir} directory`))

  var path = FS_PATH(advertiserId, date)

  fs.createReadStream(path)
    .on('error', cb)
    .on('data', data => chunks.push(data))
    .on('end', () => addOfferOnPreviousreports(
      JSON.parse(Buffer.concat(chunks)), cb))
}
