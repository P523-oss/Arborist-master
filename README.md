# Arborist

The high level goal of the ping tree service is to receive POST requests with information about a visitor and respond with a decision, either: rejection, or accept with a corresponding target.

The decisions will be based on criteria like geo (US State), and elapsed time since the user was last seen. These criteria can be derived from POST inputs like ip address.

Admin users will be able to create, edit, list, and view decision targets.

## Decisioning

A rough sketch of how this will work is:

1) POST request comes in with information about the visitor

        {
            ip: '127.0.0.1',
            publisher: 'abc',
            publisherSub: 'xyz',
            timestamp: '2018-07-19T23:28:59.513Z'
        }

2) This input is transformed into a standard "criteria" object. Notice the derived fields like `day` and `geoState`:

        {
            ip: '127.0.0.1',
            publisher: 'abc',
            publisherSub: 'xyz',
            timestamp: '2018-07-19T23:28:59.513Z',
            hour: '23',
            day: 'thu',
            geoState: 'ca',
            nDaysLastSeen: 14
        }

3) All `targets` are filtered by click caps. No `target` can receive more traffic than it allows. Here's an example `target` with max 100 accepts per day.

        {
            url: 'http://example.com',
            cpc: 0.50,
            maxAcceptsPerDay: 100,
            accept: {
                geoState: {
                    $in: ['ca', 'ny']
                },
                nDaysLastSeen: {
                    $gte: 14
                }
            }
        }

4) All remaining `targets` are filtered by criteria they are willing to accept. The above `target` example only accepts visitors from either CA or NY who have not been seen in the previous 14 days.

5) If no `targets` are left, the request is rejected, otherwise we return the url of the remaining `target` with the highest cpc.

6) This event will be logged with:

  * input criteria
  * accept/rejection status
  * target information (if accepted)

## Administration

This service will have an API with several endpoints. The decision API will be public, and admin endpoints will be private. The admin endpoints will be used to list, create, and update `targets`.

`interviewer` will provide the front-end for interacting with the admin endpoints.

Admin users will be able to:

* List all targets
* Create/Edit a target: set destination url, cpc, accept caps, and accept criteria (geo, last seen date, etc...)

## Reporting

Each request and response will be recorded with all available fields.

For each request the criteria object will be recorded:

    {
        type: 'request',
        ip: '127.0.0.1',
        publisher: 'abc',
        publisherSub: 'xyz',
        timestamp: '2018-07-19T23:28:59.513Z',
        hour: '23',
        day: 'thu',
        geoState: 'ca',
        nDaysLastSeen: 14
    }

For each response, it will be the criteria _plus_ the the target:

    {
        type: 'response',
        targetId: 'abc',
        targetUrl: 'http://example.com',
        targetCpc: 0.50,
        ip: '127.0.0.1',
        publisher: 'abc',
        publisherSub: 'xyz',
        timestamp: '2018-07-19T23:28:59.513Z',
        hour: '23',
        day: 'thu',
        geoState: 'ca',
        nDaysLastSeen: 14,
    }

Reports will lists of events summarized and available in `interviewer` by standard `react-pivot` tables.
