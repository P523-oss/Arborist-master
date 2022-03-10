var test = require('ava')
var stderr = require('test-console').stderr

var filterTargets = require('../lib/utils/filter-targets')

test.cb('filter targets based last time seen $lte', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    lastAccept: 3,
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        lastAccept: {
          $lte: 3
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        lastAccept: {
          $lte: 2
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[0], 'targets should match')
  t.end()
})

test.cb('filter targets based last time seen $lt', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    lastAccept: 3,
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        lastAccept: {
          $lt: 4
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        lastAccept: {
          $lt: 3
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[0], 'targets should match')
  t.end()
})

test.cb('filter targets based last time seen $gte', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    lastAccept: 2,
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        lastAccept: {
          $gte: 3
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        lastAccept: {
          $gte: 1
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[1], 'targets should match')
  t.end()
})

test.cb('filter targets based last time seen $gt', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    lastAccept: 4,
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        lastAccept: {
          $gt: 4
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        lastAccept: {
          $gt: 3
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[1], 'targets should match')
  t.end()
})

test.cb('filter targets based geoState $in', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $in: [
            'ak',
            'ny'
          ]
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        geoState: {
          $in: [
            'wmm',
            'we'
          ]
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[0], 'targets should match')
  t.end()
})

test.cb('filter targets based geoState $nin', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $nin: [
            'ak',
            'ny'
          ]
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        geoState: {
          $nin: [
            'ny'
          ]
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets[0], targets[1], 'targets should match')
  t.end()
})

test.cb('filter targets when we’ve never seen IP ', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK',
    lastAccept: Infinity
  }

  var targets = [
    {
      id: '12',
      accept: {
        lastAccept: {
          $gt: 4
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        lastAccept: {
          $gt: 3
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 2, 'length should be correct')
  t.deepEqual(filteredTargets, targets, 'targets should match')
  t.end()
})

test.cb('not fail when target undefined or null', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK',
    lastAccept: Infinity
  }

  var targets = [
    null,
    {
      id: 'c',
      accept: {
        lastAccept: {
          $gt: 3
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    },
    undefined
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.deepEqual(filteredTargets, [targets[1]], 'targets should match')
  t.end()
})

test.cb('not crash when state is missing', function (t) {
  var criteria = {
    ip: '64.186.123.21'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $nin: [
            'ak',
            'ny'
          ]
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        geoState: {
          $nin: [
            'ny'
          ]
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.c'
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 2, 'length should be correct')
  t.end()
})

test.cb('accept if $in contains 0 number', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: '0'
  }
  var targets = [
    {
      id: '12',
      accept: {
        hour: { $in: [0] }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.end()
})

test.cb('accept if $in contains 0 string', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: 0
  }
  var targets = [
    {
      id: '12',
      accept: {
        hour: { $in: ['0'] }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 1, 'length should be correct')
  t.end()
})

test.cb('not accept if $nin contains 0 string', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: 0
  }
  var targets = [
    {
      id: '12',
      accept: {
        hour: { $nin: ['0'] }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'length should be correct')
  t.end()
})

test.cb('not accept if $nin contains 0 number', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: '0'
  }
  var targets = [
    {
      id: '12',
      accept: {
        hour: { $nin: [0] }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'length should be correct')
  t.end()
})

test.cb('wrong accept rule shout not crash', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: '0'
  }
  var targets = [
    {
      id: '12',
      accept: {
        hour: { $ninn: [0], $nin: [0] }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'length should be correct')
  t.end()
})

test.cb('convert strings to number for correct comparison', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    hour: '2'
  }

  var targets = [
    {
      id: '12',
      accept: {
        hour: { $gte: '12' }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    }
  ]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'length should be correct')
  t.end()
})

test.cb('should not crash on wrong $in type', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $in: ''
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('should not crash on wrong $nin type', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $nin: {}
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('should not crash on wrong $subin type', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    subid: 'ABDK_BNSW_GRZZ'
  }
  var targets = [
    {
      id: '12',
      accept: {
        subid: {
          $subin: {}
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('Select the target when $exists: true and such param exists in criteria', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $exists: true
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('should not crash on wrong $subnin type', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    subid: 'ABDK_BNSW_GRZZ'
  }
  var targets = [
    {
      id: '12',
      accept: {
        subid: {
          $subnin: {}
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('filter out the target when $exists: true and there is no such param in criteria', function (t) {
  var criteria = {
    ip: '64.186.123.21'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $exists: true
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'should be no match')
  t.end()
})

test.cb('Don\'t filter out the target when $exists: false', function (t) {
  var criteria = {
    ip: '64.186.123.21'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $exists: false
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.truthy(filteredTargets, 'should be object')
  t.end()
})

test.cb('not filter target when criteria exist', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoState: 'AK'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoState: {
          $exists: false
        }
      }
    }]
  var filteredTargets = filterTargets(targets, criteria)
  t.is(filteredTargets.length, 0, 'should be no match')
  t.end()
})

test.cb('filter out targets using $subin operator', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoPostal: '197343',
    subid: 'ABDK_BNSW_GRZZ'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoPostal: {
          $subin: [
            '900*',
            '990*',
            '100*'
          ]
        },
        subid: {
          $subin: [
            '111*',
            '*AAA',
            '*BNSW*'
          ]
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        geoPostal: {
          $subin: [
            '901*',
            '991*',
            '197*'
          ]
        },
        subid: {
          $subin: [
            '111*',
            '*AAA',
            '*BNSW*'
          ]
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.fr'
    },
    {
      id: 'b',
      accept: {
        geoPostal: {
          $subin: [
            '902*',
            '992*',
            '197*'
          ]
        },
        subid: {
          $subin: [
            '111*',
            '*AAA'
          ]
        }
      },
      cpc: 0.5,
      maxAcceptsPerDay: 18,
      url: 'http://example.ru'
    }
  ]
  var selectedTargets = filterTargets(targets, criteria)
  t.deepEqual(selectedTargets, [targets[1]], 'targets should match')
  t.end()
})

test.cb('filter out targets using $subnin operator', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoPostal: '197343',
    subid: 'ABDK_BNSW_GRZZ'
  }
  var targets = [
    {
      id: '12',
      accept: {
        geoPostal: {
          $subnin: [
            '900*',
            '990*',
            '100*'
          ]
        },
        subid: {
          $subnin: [
            '111*',
            '*AAA'
          ]
        }
      },
      cpc: 0.8,
      maxAcceptsPerDay: 10,
      url: 'http://example.com12'
    },
    {
      id: 'c',
      accept: {
        geoPostal: {
          $subnin: [
            '901*',
            '991*',
            '197*'
          ]
        },
        subid: {
          $subnin: [
            '111*',
            '*AAA',
            '*BNSW*'
          ]
        }
      },
      cpc: 0.9,
      maxAcceptsPerDay: 5,
      url: 'http://example.fr'
    },
    {
      id: 'b',
      accept: {
        geoPostal: {
          $subnin: [
            '902*',
            '992*'
          ]
        },
        subid: {
          $subnin: [
            '111*',
            '*AAA'
          ]
        }
      },
      cpc: 0.5,
      maxAcceptsPerDay: 18,
      url: 'http://example.ru'
    }
  ]
  var selectedTargets = filterTargets(targets, criteria)
  t.deepEqual(selectedTargets, [targets[0], targets[2]], 'targets should match')
  t.end()
})

test.cb('not log error on empty parameter', function (t) {
  var criteria = {
    ip: '64.186.123.21',
    geoPostal: '197343'
  }
  var inspect = stderr.inspect()

  var targets = [
    {
      id: '12',
      accept: {
        subid: {
          $subnin: [
            '111*',
            '*AAA'
          ]
        }
      },
      url: 'http://example.com12'
    }
  ]
  filterTargets(targets, criteria)
  inspect.restore()
  var containsErrorMessage = !!inspect.output.find(out => out.includes('wrong type for rule '))
  t.false(containsErrorMessage, 'not contains error message')
  t.end()
})
