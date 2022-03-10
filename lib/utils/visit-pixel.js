var _ = require('lodash')
var mustache = require('mustache')
var request = require('request')

module.exports = function visitPixel (pixelType, opts) {
  try {
    var renderOpts = _.merge({}, opts.criteria, opts.target, { requestId: opts.requestId })
    var url = mustache.render(opts.obj[pixelType], renderOpts)
    var pixelTypeUrl = pixelType + 'Url'
  } catch (err) {
    return console.error(err)
  }
  console.log({
    [pixelTypeUrl]: url,
    type: 'request',
    requestId: opts.criteria.requestId
  })

  try {
    request.get(url, function (err, res, body) {
      console.log({
        [pixelTypeUrl]: url,
        type: 'response',
        requestId: opts.criteria.requestId,
        statusCode: (res || {}).statusCode,
        body: body,
        error: (err || {}).message
      })
    })
  } catch (err) {
    console.error({
      error: err,
      location: 'visit-pixel',
      url: url
    })
  }
}
