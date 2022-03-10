var async = require('async')

var getRevenue = require('./external-requests/revenue')
var getImpressions = require('./impressions')
var lastDays = require('./utils/last-days')
var getTargetPublisherTierKey = require('./models/targets').getTargetPublisherTierKey
var log = require('./utils/log')

module.exports = {
  getTopTarget,
  scoreTargets
}

function getTopTarget ({ targets, criteria }, cb) {
  targets = targets.filter(target => target && target.id)
  if (targets.length === 1) {
    return cb(null, targets[0])
  }

  if (!validateCriteria(criteria) || !targets.length) {
    return cb(null)
  }

  var daysRange = lastDays(14)
  var t0 = Date.now()

  async.parallel({
    reports: cb => getImpressions({ daysRange, targets, criteria }, cb),
    targets: cb => async.map(targets, (target, cb) =>
      addStats({ target, criteria, daysRange }, cb), cb)
  }, function (err, { reports, targets }) {
    if (err) return cb(err)

    targets = addImpressionRpi({ daysRange, targets, reports, criteria })

    var scoreOpts = { targets, explore: 50, requestId: criteria.requestId }
    scoreTargets(scoreOpts, function (err, targets) {
      console.log({
        externalAPI: 'scoring',
        responseTime: Date.now() - t0
      })
      if (err) return cb(err)

      cb(null, targets[0])
    })
  })
}

function scoreTargets ({ targets, explore, requestId }, cb) {
  const RPIs = targets.map((target) => target.rpi)
  const maxRPI = Math.max(...RPIs) || 1
  const impressionsTotal = targets.reduce(
    (acc, target) => acc + target.impressions, 0)

  targets.forEach(function (target) {
    const opts = {
      id: target.id,
      rpi: target.rpi,
      maxRPI,
      impressions: target.impressions,
      impressionsTotal,
      requestId
    }
    target.score = score(opts, explore) * (target.boost || 1)
  })

  targets.sort((a, b) => b.score - a.score)

  cb(null, targets)
}

function score (opts, explore = 25) {
  var { rpi, maxRPI, impressions, impressionsTotal } = opts
  var rpiScore = rpi / maxRPI
  var impScore = Math.log(impressionsTotal) / impressions
  var score = rpiScore + Math.sqrt((explore * impScore))
  log({ rpiScore, impScore, score, ...opts })
  return score
}

function addStats ({ target, criteria, daysRange }, cb) {
  if (!target) return cb(null)

  getRevenue({
    daysRange,
    origin: criteria.origin,
    endpoint: target.endpoint
  }, function (err, response) {
    if (err) return cb(err)
    var revenueTotal = response.reduce((acc, row) =>
      acc + getRevenueRow(row), 0)

    cb(null, { revenueTotal, ...target })
  })
}

function addImpressionRpi ({ daysRange, targets, reports, criteria }) {
  return targets.map(target => {
    target.impressions = 0
    daysRange.map(date => {
      var keyTargetPublisherTier = getTargetPublisherTierKey(date, target.id, criteria.publisher, criteria.tier)
      target.impressions += reports[keyTargetPublisherTier]
        ? Number(reports[keyTargetPublisherTier]) : 0
    })

    var key = `${criteria.origin}_${target.endpoint}_${target.id}`

    target.impressions += reports[key] ? reports[key] : 0
    target.rpi = (target.impressions === 0)
      ? 0
      : (target.revenueTotal / target.impressions)
    return target
  })
}
function getRevenueRow (row) {
  return row && row.revenue && row.revenue.usd ? row.revenue.usd : 0
}

function validateCriteria (criteria) {
  return criteria && criteria.ip
}
