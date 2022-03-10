const { PubSub } = require('@google-cloud/pubsub')
const config = require('../config').gcs

var log = require('./utils/log')

const pubsub = new PubSub({
  projectId: config.project,
  credentials: config.creds
})

module.exports = process.env.NODE_ENV === 'production'
  ? publishEvent
  : function (event, cb) { log(event); cb && cb() }

function publishEvent (event, cb) {
  cb = cb || function () {}
  const topicName = config.topic
  const data = JSON.stringify(event)

  const dataBuffer = Buffer.from(data)

  pubsub
    .topic(topicName, {
      batching: {
        maxMessages: 30,
        maxMilliseconds: 30 * 1000
      }
    })
    .publish(dataBuffer)
    .then(messageId => cb(null, messageId))
    .catch(err => cb(err))
}
