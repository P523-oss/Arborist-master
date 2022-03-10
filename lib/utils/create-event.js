module.exports = function createEvent (target, criteria, publisher = {}) {
  return {
    type: target ? 'accept' : 'reject',
    ...(target && { targetId: target.id }),
    ...(target && { targetUrl: target.url }),
    ...(target && { targetEndpoint: target.endpoint }),
    ...(target && { targetOrigin: target.origin }),
    ...(target && { targetCpc: target.cpc }),
    ...(target && { targetScore: target.score }),
    ...(target && { targetName: target.name || target.id }),
    ...(target && { advertiserId: target.advertiserId }),
    ...publisher && { publisherName: publisher.name },
    ...criteria
  }
}
