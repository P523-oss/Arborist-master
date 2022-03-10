var map = require('async/map')
var async = require('async')
var mustache = require('mustache')
var stream = require('stream')
var _ = require('lodash')
var PathKey = require('pathkey')
var slug = require('cuid').slug
var URL = require('url').URL

var pk = PathKey({
  pathKey: '_path',
  pathSep: '/',
  keySep: '\xff'
})

var { bucketName } = require('../../config')
var db = require('../db')
var Events = require('../models/events')
var RuleSet = require('../models/rule-set')
var config = require('../../config').gcs
var {
  checkId, formatModel,
  parseModel
} = require('../utils/process-model-object')

var TARGET_KEY = id => `target:${id}`
var TARGET_LIST_KEY = 'targets'
var TARGET_HISTORY_KEY = id => `targetHistory:${id}`
var TARGET_HISTORY_LIST_KEY = id => `targetHistoryList:${id}`
var VISIT_KEY = id => `visit:${id}`
var VISIT_REVENUE_KEY = id => `visitRevenue:${id}`
var INITIATE_INTER_KEY = id => `initiateInter:${id}`
var INITIATE_APPLICATION_KEY = id => `initiateApplication:${id}`
var LEAD_KEY = id => `lead:${id}`
var INITIATE_CREDIT_UPSELL_KEY = id => `initiateCreditUpsell:${id}`
var YES_SECURITY_KEY = id => `YESsecurity:${id}`
var NO_SECURITY_KEY = id => `NOsecurity:${id}`
var HIT_BACK_KEY = id => `HITback:${id}`
var LEAD_SOLD_KEY = id => `leadSold:${id}`
var ADVERSE_KEY = id => `adverse:${id}`
var AUTO_KEY = id => `AUTO:${id}`
var CM_KEY = id => `CM:${id}`
var TRAFFIC_DATE_TARGET_PUBLISHER_TIER_KEY = (date, target, publisher, tier) =>
  `traffic:target:${target}:date:${date}:publisher:${publisher || ''}:tier:${tier || ''}`
var TRAFFIC_KEY = (date, targetId) => `traffic:${date}:${targetId}`
var EVENT_COUNT_KEY = (advertiserId, date) => {
  var objKey = {
    _path: 'advertiserId/date',
    advertiserId: advertiserId || '',
    date
  }
  return pk.create(objKey)
}
var EVENT_COUNT_FIELD = (targetId, originId, subId, eventType) => {
  var objField = {
    _path: 'targetId/originId/subId/eventType',
    targetId,
    originId,
    subId: subId || '',
    eventType
  }
  return pk.create(objField)
}

var { Storage } = require('@google-cloud/storage')
var storage = new Storage({
  projectId: config.project,
  credentials: config.creds
})
var myBucket = storage.bucket(bucketName)

module.exports = {
  get,
  put,
  putTargetUrl,
  popTargetUrl,
  popVisitInfo,
  popEventInfo,
  list,
  listWithMergedRuleset,
  incrTrafficPublisher,
  incrTraffic,
  incrEventCount,
  getEventCount,
  getTrafficTargetTierPublisher,
  linkTargetToAdvertiser,
  getTargetHistoryList,
  getTargetPublisherTierKey: TRAFFIC_DATE_TARGET_PUBLISHER_TIER_KEY
}

function get (id, cb) {
  var key = TARGET_KEY(id)

  async.parallel({
    target: cb => db.hgetall(key, cb),
    traffic: cb => getTraffic(id, cb)
  }, function (err, { target, traffic }) {
    if (err) return cb(err)
    if (!target) return cb()

    var parsedTarget = parseModel(target)
    parsedTarget.traffic = traffic || 0

    getPublishersWithTraffic(parsedTarget, function (err, publishers) {
      if (err) return cb(err)

      parsedTarget.publishers = publishers
      cb(null, { id, ...parsedTarget })
    })
  })
}

function put (target, cb) {
  var err = validate(target)
  if (err) return cb(err)

  var image = _.get(target, 'adParams.image')

  if (!image) return putTarget({ target }, cb)

  myBucket.exists(function (err, exists) {
    if (err) return cb(err)
    if (exists) return writeImage({ target, image }, cb)

    myBucket.create(function (err) {
      if (err) return cb(err)
      writeImage({ target, image }, cb)
    })
  })
}

function putTarget ({ target }, cb) {
  get(target.id, function (err, parsedTarget) {
    if (err) return cb(err)

    if (parsedTarget) {
      target.modifiedAt = new Date().toISOString()
    } else {
      target.createdAt = new Date().toISOString()
    }

    var args = formatModel(target)
    var id = target.id
    var targetKey = TARGET_KEY(id)

    var targetIdHistory = slug()
    var targetHistoryKey = TARGET_HISTORY_KEY(targetIdHistory)
    var targetHistoryListKey = TARGET_HISTORY_LIST_KEY(id)

    db.multi()
      .del(targetKey)
      .sadd(TARGET_LIST_KEY, id)
      .sadd(targetHistoryListKey, targetIdHistory)
      .hmset(targetKey, args)
      .hmset(targetHistoryKey, args)
      .exec(function (err) {
        if (err) return cb(err)
        cb(null, {
          id: id,
          ...target
        })
      })
  })
}

function getTargetHistoryList (id, cb) {
  var targetHistoryListKey = TARGET_HISTORY_LIST_KEY(id)
  db.smembers(targetHistoryListKey, function (err, ids) {
    if (err) return cb(err)

    map(ids, getTargetHistory, cb)
  })
}

function getTargetHistory (id, cb) {
  var key = TARGET_HISTORY_KEY(id)

  db.hgetall(key, function (err, target) {
    if (err) return cb(err)
    if (!target) return cb()

    var parsedTarget = parseModel(target)

    getPublishersWithTraffic(parsedTarget, function (err, publishers) {
      if (err) return cb(err)

      parsedTarget.publishers = publishers
      cb(null, { id, ...parsedTarget })
    })
  })
}
function writeImage ({ image, target }, cb) {
  var filename = _.get(target, 'adParams.filename')
  var contentType = _.get(target, 'adParams.contentType')
  var bufferStream = new stream.PassThrough()

  bufferStream.end(Buffer.from(image, 'base64'))
  var file = myBucket.file(filename)
  bufferStream.pipe(file.createWriteStream({
    metadata: {
      metadata: {
        contentType: contentType,
        custom: 'metadata'
      }
    },
    public: true,
    validation: 'md5'
  }))
    .on('error', function (err) {
      if (err) return cb(err)
    })
    .on('finish', function (err) {
      if (err) return cb(err)
      _.unset(target, 'adParams.image')
      _.set(target, 'adParams.imageUrl', getFileNameWithBucket(_.get(target, 'adParams.filename')))

      putTarget({ target }, cb)
    })
}

function putTargetUrl ({ id, target, criteria }, cb) {
  if (!target) return cb(null)
  var value = getVisitValue({ target, criteria })
  if (!value) return cb(null)

  async.parallel({
    putPixelData: cb => putPixelData({ id, value }, cb),
    putRequestInLevel: cb => Events.putRequestIdInfo({ id, value }, cb)
  }, cb)
}

function putPixelData ({ id, value }, cb) {
  db.multi()
    .lpush(VISIT_KEY(id), value)
    .lpush(VISIT_REVENUE_KEY(id), value)
    .lpush(INITIATE_INTER_KEY(id), value)
    .lpush(INITIATE_APPLICATION_KEY(id), value)
    .lpush(LEAD_KEY(id), value)
    .lpush(INITIATE_CREDIT_UPSELL_KEY(id), value)
    .lpush(YES_SECURITY_KEY(id), value)
    .lpush(NO_SECURITY_KEY(id), value)
    .lpush(HIT_BACK_KEY(id), value)
    .lpush(LEAD_SOLD_KEY(id), value)
    .lpush(ADVERSE_KEY(id), value)
    .lpush(AUTO_KEY(id), value)
    .lpush(CM_KEY(id), value)
    .expire(VISIT_KEY(id), 60 * 60 * 24)
    .expire(VISIT_REVENUE_KEY(id), 60 * 60 * 24 * 2)
    .expire(INITIATE_INTER_KEY(id), 60 * 60 * 24 * 7)
    .expire(INITIATE_APPLICATION_KEY(id), 60 * 60 * 24 * 7)
    .expire(LEAD_KEY(id), 60 * 60 * 24 * 7)
    .expire(INITIATE_CREDIT_UPSELL_KEY(id), 60 * 60 * 24 * 7)
    .expire(YES_SECURITY_KEY(id), 60 * 60 * 24 * 7)
    .expire(NO_SECURITY_KEY(id), 60 * 60 * 24 * 7)
    .expire(HIT_BACK_KEY(id), 60 * 60 * 24 * 7)
    .expire(LEAD_SOLD_KEY(id), 60 * 60 * 24 * 7)
    .expire(ADVERSE_KEY(id), 60 * 60 * 24 * 7)
    .expire(AUTO_KEY(id), 60 * 60 * 24 * 7)
    .expire(CM_KEY(id), 60 * 60 * 24 * 7)
    .exec(cb)
}

function popVisitInfo (id, cb) {
  db.rpop(VISIT_REVENUE_KEY(id), function (err, response) {
    if (err) return cb(err)
    if (!response) return cb(response)

    var parsed = JSON.parse(response)
    parsed = typeof parsed === 'object' ? parsed : {}

    cb(null, parsed)
  })
}

function popEventInfo ({ requestId, eventType }, cb) {
  var keyBuilder
  switch (eventType) {
    case 'initiateInter':
      keyBuilder = INITIATE_INTER_KEY
      break
    case 'initiateApplication':
      keyBuilder = INITIATE_APPLICATION_KEY
      break
    case 'lead':
      keyBuilder = LEAD_KEY
      break
    case 'initiateCreditUpsell':
      keyBuilder = INITIATE_CREDIT_UPSELL_KEY
      break
    case 'YESsecurity':
      keyBuilder = YES_SECURITY_KEY
      break
    case 'NOsecurity':
      keyBuilder = NO_SECURITY_KEY
      break
    case 'HITback':
      keyBuilder = HIT_BACK_KEY
      break
    case 'leadSold':
      keyBuilder = LEAD_SOLD_KEY
      break
    case 'adverse':
      keyBuilder = ADVERSE_KEY
      break
    case 'AUTO':
      keyBuilder = AUTO_KEY
      break
    case 'CM':
      keyBuilder = CM_KEY
      break
  }
  db.rpop(keyBuilder(requestId), function (err, response) {
    if (err) return cb(err)
    if (!response) return cb(response)

    var parsed = JSON.parse(response)
    cb(null, parsed)
  })
}

function getVisitValue ({ target, criteria }) {
  try {
    var targetUrl = mustache.render(target.url, criteria)
    if (target.template) {
      targetUrl = mustache.render(target.template, criteria)
    }
  } catch (err) {
    console.error({
      error: err,
      target: target,
      criteria: criteria
    })
    return
  }

  return JSON.stringify({
    targetUrl: targetUrl,
    target: {
      ...(target && { targetId: target.id }),
      ...(target && { targetUrl: target.url }),
      ...(target && { targetEndpoint: target.endpoint }),
      ...(target && { targetOrigin: target.origin }),
      ...(target && { targetCpc: target.cpc }),
      ...(target && { targetScore: target.score })
    },
    criteria
  })
}

function popTargetUrl (id, cb) {
  db.rpop(VISIT_KEY(id), cb)
}

function list (cb) {
  db.smembers(TARGET_LIST_KEY, function (err, ids) {
    if (err) return cb(err)

    map(ids, get, cb)
  })
}

function listWithMergedRuleset (cb) {
  list(function (err, targets) {
    if (err) return cb(err)

    map(targets, mergeRuleSet, cb)
  })
}

function mergeRuleSet (target, cb) {
  var accept = target.accept
  if (!accept.ruleId) return cb(null, target)

  RuleSet.listWithIds(accept.ruleId.$in, function (err, ruleSets) {
    if (err) return cb(err)

    ruleSets = ruleSets.filter(ruleSet => ruleSet)
    ruleSets.forEach(function (ruleSet) {
      if (ruleSet.isAppliedToMultiTarget) {
        accept = Object.assign({}, ruleSet.accept, accept)
      }
    })

    _.unset(accept, 'ruleId')
    target.accept = accept
    cb(null, target)
  })
}

function incrTraffic (targetId, cb) {
  var date = new Date().toISOString().slice(0, 10)
  var key = TRAFFIC_KEY(date, targetId)

  db.multi()
    .incr(key)
    .expire(key, 60 * 60 * 24)
    .exec(cb)
}

function incrTrafficPublisher ({ target, criteria }, cb) {
  var date = new Date().toISOString().slice(0, 10)
  var object = (target.publishers || []).find(p => p.incr)
  var publisher = (object || {}).publisher || ''
  var tier = (object || {}).tier || ''

  if (!object) {
    publisher = criteria.publisher
    tier = criteria.tier
  }

  var key = TRAFFIC_DATE_TARGET_PUBLISHER_TIER_KEY(
    date,
    target.id,
    publisher,
    tier
  )

  db.multi()
    .incr(key)
    .expire(key, 60 * 60 * 24 * 14)
    .exec(cb)
}

function getTrafficTargetTierPublisher ({ date, publisher, tier, targetId }, cb) {
  var key = TRAFFIC_DATE_TARGET_PUBLISHER_TIER_KEY(
    date,
    targetId,
    publisher,
    tier
  )

  db.get(key, cb)
}

function getTraffic (targetId, cb) {
  var date = new Date().toISOString().slice(0, 10)
  var key = TRAFFIC_KEY(date, targetId)

  db.get(key, cb)
}

function getPublishersWithTraffic (target, cb) {
  var publishers = target.publishers || []
  var date = new Date().toISOString().slice(0, 10)

  map(publishers, (p, cb) => {
    var key = TRAFFIC_DATE_TARGET_PUBLISHER_TIER_KEY(
      date,
      target.id,
      (p.publisher || '').toString(),
      (p.tier || '').toString()
    )
    db.get(key, function (err, traffic) {
      if (err) return cb(err)

      p.traffic = traffic
      cb(null, p)
    })
  }, cb)
}

function incrEventCount ({ targetId, originId, subId, eventType }, cb) {
  var date = new Date().toISOString().slice(0, 10)
  get(targetId, function (err, target) {
    if (err) return cb(err)

    var key = EVENT_COUNT_KEY((target || {}).advertiserId, date)
    var field = EVENT_COUNT_FIELD(targetId, originId, subId, eventType)
    db.multi()
      .hincrby(key, field, 1)
      .expire(key, 60 * 60 * 24 * 14)
      .exec(cb)
  })
}

function getEventCount ({ advertiserId, date }, cb) {
  var key = EVENT_COUNT_KEY(advertiserId, date)
  db.hgetall(key, cb)
}

function getFileNameWithBucket (fileName) {
  return `https://${bucketName}.storage.googleapis.com/${fileName}`
}

function validate (target) {
  var err = null

  var idValidation = checkId(target.id, 'target')
  if (idValidation) return idValidation

  if (target.name && (typeof target.name !== 'string')) {
    err = new Error('target name must be string')
    err.type = 'validation'
    return err
  }

  if (target.url && !stringIsAValidUrl(target.url)) {
    err = new Error('URL is not valid')
    err.type = 'validation'
    return err
  }

  if (target.url && !checkTemplateBracket(target.url)) {
    err = new Error('target URL\'s brackets validation failed')
    err.type = 'validation'
    return err
  }

  return err
}

function checkTemplateBracket (expr) {
  const holder = []
  const openBrackets = ['{']
  const closedBrackets = ['}']
  for (const letter of expr) {
    if (openBrackets.includes(letter)) {
      holder.push(letter)
    } else if (closedBrackets.includes(letter)) {
      const openPair = openBrackets[closedBrackets.indexOf(letter)]
      if (holder[holder.length - 1] === openPair) {
        holder.splice(-1, 1)
      } else {
        holder.push(letter)
        break
      }
    }
  }
  return (holder.length === 0)
}

function stringIsAValidUrl (string) {
  try {
    var url = new URL(string)
    return !!url
  } catch (err) {
    return false
  }
}

function linkTargetToAdvertiser ({ advertiserId, targetId }, cb) {
  get(targetId, (err, target) => {
    if (err) return cb(err)

    if (target.advertiserId === advertiserId) return cb()

    target.advertiserId = advertiserId
    put(target, cb)
  })
}
