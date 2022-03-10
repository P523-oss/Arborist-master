var nodeEnv = process.env.NODE_ENV

module.exports = function log (object) {
  if (nodeEnv !== 'development' && nodeEnv !== 'test') console.log(object)
}
