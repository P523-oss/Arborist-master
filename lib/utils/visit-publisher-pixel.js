var visitPixel = require('./visit-pixel')
module.exports = function visitPublisherPixel (publisher, criteria, target, requestId) {
  if (!publisher || !publisher.publisherPixel) return
  var opts = { obj: publisher, criteria, target, requestId }
  return visitPixel('publisherPixel', opts)
}
