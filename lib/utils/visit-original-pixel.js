var visitPixel = require('./visit-pixel')
module.exports = function visitOriginalPixel (origin, criteria, target, requestId) {
  if (!origin || !origin.originPixel || !target) return
  var opts = { obj: origin, criteria, target, requestId }
  return visitPixel('originPixel', opts)
}
