module.exports = function parseSafelyJSON (json) {
  var parsed

  try {
    parsed = JSON.parse(json)
  } catch (e) {}

  return parsed
}
