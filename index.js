var request = require('request').defaults({
    jar: true
});
var sleep = require('sleep');
var Q = require('q');
var D = false; // Toggle for printing debug strings on console

var openConnections = []; // List of open connections for sending server side messages. Primarily used sending progress

(function main() {
    var commandLineArgs = process.argv;
    // Should we start the app as a web server or a command line tool depends on the number of command line arguments when running this file
    if (commandLineArgs.length === 5 || commandLineArgs.length === 6) {
        // node index.js   PHX   HYD,BLR,BOM,DEL,MAA,GOI,IXE  2015-12-24T00:00:00.000,2015-12-25T00:00:00.000   2016-01-16T00:00:00.000,2016-01-17T00:00:00.000
        // or for one way
        // node index.js   PHX   HYD,BLR,BOM,DEL,MAA,GOI,IXE  2015-12-24T00:00:00.000,2015-12-25T00:00:00.000
        var args = getRequestArguments(commandLineArgs.slice(2));
        printCheapest(args.sources, args.destinations, args.startDates, args.endDates);
    } else {
        var express = require('express');
        var app = express();

        var path = require('path'),
            favicon = require('serve-favicon'),
            logger = require('morgan'),
            cookieParser = require('cookie-parser'),
            bodyParser = require('body-parser');


        // view engine setup
        app.set('views', path.join(process.cwd(), 'views'));
        app.set('view engine', 'jade');

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(cookieParser());
        app.use(express.static(path.join(process.cwd(), 'public')));
        app.use('/components', express.static(path.join(process.cwd(), 'public/components')));

        var server = app.listen(3000, function() {
            var port = server.address().port;
            console.log('Flight search server listening at http://localhost:%s', port);
        });

        defineRoutes(app);
    }
})();

function getRequestArguments(args) {
    // All possible source airpots you want to fly from. Airport acronym from Student Universe website
    var sources = args[0].split(',').map(function(curr) {
        return curr.trim();
    });
    // All possible destinations you can fly to. Airport acronyms from Student Universe website
    var destinations = args[1].split(',').map(function(curr) {
        return curr.trim();
    });;
    // All possible dates on which you want to start
    var startDates = args[2].split(',').map(function(curr) {
        return curr.trim();
    });
    // All possible dates you want to return back. Has to have at least one.
    var endDates = [];
    if (!!args[3]) {
        endDates = args[3].split(',').map(function(curr) {
            return curr.trim();
        });
    };

    return {
        sources: sources,
        destinations: destinations,
        startDates: startDates,
        endDates: endDates
    };
}

/**
 * Computes the cheapest prices table for the given sources, destinations, start and end dates
 * @param  {array} sources      List of source airport codes
 * @param  {array} destinations List of destination airport codes
 * @param  {array} startDates   List of start dates in ISO format
 * @param  {array} endDates     List of end dates in ISO format
 * @return {promise}              Promise for asynchronous HTTP requests. Will be resolved once all requests are processed.
 */
function printCheapest(sources, destinations, startDates, endDates) {
    var deferred = Q.defer();

    var url = 'https://www.studentuniverse.com/wapi/flightsWapi/searchFlightsSpanned';
    var data = {
        "tripElements": [{
            "origin": "<<CHANGES>>",
            "destination": "<<CHANGES>>",
            "dateTime": "<<CHANGES>>"
        }, {
            "origin": "<<CHANGES>>",
            "destination": "<<CHANGES>>",
            "dateTime": "<<CHANGES>>"
        }],
        "numberOfPassengers": 1,
        "details": false,
        "searchStartTime": "2015-09-16T16:41:11.789",
        "lowestPrice": null,
        "source": "home",
        "phoneInDiscountCode": null,
        "searchKey": null
    }
    var comparison_table = [], // price table of all possible combinations of sources, destination and dates
        counter = 1;

    // Total combinations of sources, destinations, start ends and return dates for logging
    // If end dates are not mentioned we replace it with 1 so that the product is not zero
    var total_combinations = sources.length * destinations.length *
        startDates.length * (endDates.length > 0 ? endDates.length : 1);
    var iprogress = total_combinations;
    console.log('Total Combinations: ' + total_combinations);
    var status_interval = total_combinations / 10; // for every `status_interval` completion of combinations, print status string
    var sendReqWt = 0.25; // Weight of sending request. Used for computing the progress of work done
    var processingResWt = 0.75; // Weight of processing the response. Used for computing the progress of work done
    var isOneWay = endDates.length == 0; // true if journey is one way

    // CSV Formatted output
    console.log('Sno,Cities,Start Date,End Date,Price,ToDuration,FroDuration,Airlines');

    function setRequestPayload(isd, isource, idestination, ied) {
        if (isOneWay && data.tripElements.length == 2) {
            data.tripElements.splice(1, 1); // remove the return journey object in the tripElements array
        };
        data.tripElements[0].dateTime = startDates[isd]; // set start date
        data.tripElements[0].origin = sources[isource]; // set origin for onward
        data.tripElements[0].destination = destinations[idestination]; // set destination for onward
        if (!isOneWay) {
            data.tripElements[1].dateTime = endDates[ied]; // set end date
            data.tripElements[1].origin = destinations[idestination]; // set origin for return
            data.tripElements[1].destination = sources[isource]; // set destination for return
        };
    }

    function setCheapestItinerary(body, cheapest_itinerary) {
        if (!body.itineraries) {
            if (D) {
                // StudentUniverse couldn't find results for a source - destination - start date - end date combination
                console.log(counter, 'Could not find itineraries for a combination');
            };
        } else {
            // Find the cheapest itinerary from the list of itineraries returned
            for (var i = 0; i < body.itineraries.length; i++) {
                var itinerary = body.itineraries[i];
                if (itinerary.total < cheapest_itinerary.price) {
                    // Set all the fields of the cheapest itinerary found so far
                    cheapest_itinerary.source = itinerary.legs[0].departureAirport;
                    cheapest_itinerary.destination = itinerary.legs[0].arrivalAirport;
                    cheapest_itinerary.sd = itinerary.legs[0].departureTime;
                    cheapest_itinerary.price = itinerary.total;
                    cheapest_itinerary.toduration = (itinerary.legs[0].duration / 60).toFixed(2);

                    if (isOneWay) {
                        cheapest_itinerary.ed = 'NA';
                        cheapest_itinerary.froduration = 'NA';
                    } else {
                        cheapest_itinerary.ed = itinerary.legs[itinerary.legs.length - 1].departureTime;
                        cheapest_itinerary.froduration = (itinerary.legs[itinerary.legs.length - 1].duration / 60).toFixed(2);
                    }

                    cheapest_itinerary.airlines = itinerary.carrierDescription;
                }
            }
            // Add the key of the form 'source-destination' if not present and initialize. Eg: LAX-BLR
            comparison_table.push(cheapest_itinerary);
            // print the output in CSV format on console
            console.log([counter, Object.keys(cheapest_itinerary).map(function(key) {
                return cheapest_itinerary[key];
            }).join(',')].join(','));
        }
    }

    function makeHttpRequest(isd, isource, idestination, ied) {
        setRequestPayload(isd, isource, idestination, ied);

        // HTTP request to StudentUniverse site
        request({
            method: 'POST',
            uri: url,
            body: data,
            json: true
        }, function(error, response, body) {
            if (error) {
                // Can be SOCKET Timeout, Server Hang Up etc.
                console.log(counter, 'error', error);
                deferred.reject(error);
            } else {
                var cheapest_itinerary = {
                    source: null, // cheapest itinerary for the source
                    destination: null, // cheapest itinerary for the destination
                    sd: null, // start date of the cheapest itinearary
                    ed: null, // end date of the cheapest itinearary
                    price: Infinity, // price of the cheapest itinearary
                    toduration: null, // onward journey duration of the cheapest itinearary
                    froduration: null, // return journey duration of the cheapest itinearary
                    airlines: null // name of the airlines of the cheapest itinearary
                };
                setCheapestItinerary(body, cheapest_itinerary);
                sendServerMessage((counter / total_combinations) * processingResWt + sendReqWt); // sendReqWt is the minimum value
                if (counter >= total_combinations) {
                    console.log('Done processing all requests');
                    deferred.resolve(comparison_table);
                };
            }
            counter += 1;
        });
    }

    function handleTwoWayRoutes() {
        // Loop over each source, destination, start and end dates
        for (var isource = 0; isource < sources.length; isource++) {
            for (var idestination = 0; idestination < destinations.length; idestination++) {
                for (var isd = 0; isd < startDates.length; isd++) {
                    for (var ied = 0; ied < endDates.length || isOneWay; ied++) {

                        // We sleep for sometime so as not to flood the Student Universe server.
                        // Can try setTimeout() also
                        sleep.usleep(500000); // 500 milli seconds
                        makeHttpRequest(isd, isource, idestination, ied);
                        logStatus();
                        sendServerMessage((1 - (iprogress / total_combinations)) * sendReqWt);
                    }
                }
            }
        }
    }

    function logStatus() {
        // Print status of requests being sent at the intervals of `status_interval`
        if (D && iprogress % status_interval === 0) {
            console.log('Sending request: ', data.tripElements);
        };
        iprogress -= 1;
    }

    function handleOneWayRoutes() {
        // Loop over each source, destination, start dates
        for (var isource = 0; isource < sources.length; isource++) {
            for (var idestination = 0; idestination < destinations.length; idestination++) {
                for (var isd = 0; isd < startDates.length; isd++) {

                    // We sleep for sometime so as not to flood the Student Universe server.
                    // Can try setTimeout() also
                    sleep.usleep(500000); // 500 milli seconds
                    makeHttpRequest(isd, isource, idestination, null);
                    logStatus();
                    sendServerMessage((1 - (iprogress / total_combinations)) * sendReqWt);
                }
            }
        }
    }

    if (isOneWay)
        handleOneWayRoutes();
    else
        handleTwoWayRoutes();
    return deferred.promise;
}

function defineRoutes(app) {
    app.get('/', function(req, res) {
        res.render('index', {
            title: 'Flight Search # Powered by Student Universe'
        });
        // res.send("Triggered the requests. Check the console for results.");
    });

    /**
     * Returns the price table for all possible combinations returned by Student Universe
     *
     * Request:
     * {
            src: 'PHX',
            dest: 'DEL, BOM',
            sd: '2015-12-24T00:00:00.000,2015-12-25T00:00:00.000',
            ed: '2016-01-16T00:00:00.000,2016-01-17T00:00:00.000'
        }
     * Response:
     * {
            "table": ]
                {
                    "source": "PHX",
                    "destination": "DEL",
                    "sd": "2015-12-24T13:10:00",
                    "ed": "2016-01-16T04:25:00",
                    "price": 1654.99,
                    "toduration": "25.17",
                    "froduration": "31.15",
                    "airlines": "Multiple Airlines"
                },
                {
                    "sourceDestination": "PHX-HYD",
                    "sd": "2015-12-24T13:10:00",
                    "ed": "2016-01-16T04:25:00",
                    "price": 1800.99,
                    "toduration": "25.17",
                    "froduration": "31.15",
                    "airlines": "Multiple Airlines"
                },
            ]
        }
     */
    app.post('/fetchPriceTable', function(req, res) {
        var args = getRequestArguments([req.body.src, req.body.dest, req.body.sd, req.body.ed]);
        printCheapest(args.sources, args.destinations, args.startDates, args.endDates)
            .then(function(priceTable) {
                res.json({
                    table: priceTable
                });
            }, function(error) {
                res.json({
                    error: error
                });
            });
    });

    /**
     * Open connection for sending progress
     */
    app.get('/progress', function(req, res) {

        // set timeout as high as possible
        // req.socket.setTimeout(Infinity);

        // send headers for event-stream connection
        // see spec for more information
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        // push this res object to our global variable
        openConnections.push(res);

        // When the request is closed, e.g. the browser window
        // is closed. We search through the open connections
        // array and remove this connection.
        req.on("close", function() {
            var toRemove;
            for (var j = 0; j < openConnections.length; j++) {
                if (openConnections[j] == res) {
                    toRemove = j;
                    break;
                }
            }
            openConnections.splice(j, 1);
            console.log("\nOpen Socket Connections: " + openConnections.length + "\n");
        });
    });
}

/**
 * Send a server message using the open connections
 * Primarily used for sending progress
 * @param  {String}
 * @return {NULL}
 */
function sendServerMessage(message) {
    openConnections.forEach(function(resp) {
        resp.write("data: " + message + '\n\n'); // Note the extra newline
    });
}
