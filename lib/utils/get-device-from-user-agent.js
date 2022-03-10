var uaParser = require('ua-parser-js')

module.exports = function getDeviceFromUserAgent (userAgent) {
  return (uaParser(userAgent).device || {}).type
}
