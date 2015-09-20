var request = require('request').defaults({
    jar: true
});
var sleep = require('sleep');
var Q = require('q');
var D = false; // Toggle for printing debug strings on console

(function main() {
    var commandLineArgs = process.argv;
    // Should we start the app as a web server or a command line tool depends on the number of command line arguments when running this file
    if (commandLineArgs.length === 6) {
        // node index.js   PHX   HYD,BLR,BOM,DEL,MAA,GOI,IXE  2015-12-24T00:00:00.000,2015-12-25T00:00:00.000   2016-01-16T00:00:00.000,2016-01-17T00:00:00.000
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
    var endDates = args[3].split(',').map(function(curr) {
        return curr.trim();
    });

    return {
        sources: sources,
        destinations: destinations,
        startDates: startDates,
        endDates: endDates
    };
}

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
    var comparison_table = {}, // price table of all possible combinations of sources, destination and dates
        counter = 1;

    // Total combinations of sources, destinations, start ends and return dates for logging
    var total_combinations = sources.length * destinations.length * startDates.length * endDates.length;
    var iprogress = total_combinations;
    console.log('Total Combinations: ' + total_combinations);
    var status_interval = total_combinations / 10; // for every 10% percent print status string

    // CSV Formatted output
    console.log('Sno,Cities,Start Date,End Date,Price,ToDuration,FroDuration,Airlines');

    // Loop over each source, destination, start and end dates
    for (var isource = 0; isource < sources.length; isource++) {
        for (var idestination = 0; idestination < destinations.length; idestination++) {
            comparison_table[sources[isource] + "-" + destinations[idestination]] = [];
            for (var isd = 0; isd < startDates.length; isd++) {
                for (var ied = 0; ied < endDates.length; ied++) {

                    // We sleep for sometime so as not to flood the Student Universe server. 
                    // Can try setTimeout() also
                    sleep.usleep(500000); // 500 milli seconds

                    data.tripElements[0].dateTime = startDates[isd]; // set start date
                    data.tripElements[0].origin = sources[isource]; // set origin for onward
                    data.tripElements[0].destination = destinations[idestination]; // set destination for onward

                    data.tripElements[1].dateTime = endDates[ied]; // set end date
                    data.tripElements[1].origin = destinations[idestination]; // set origin for return
                    data.tripElements[1].destination = sources[isource]; // set destination for return

                    // Print status of requests being sent at the intervals of `status_interval`
                    if (D && iprogress % status_interval === 0) {
                        console.log('Sent request: ', data.tripElements);
                    };
                    iprogress -= 1;

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
                                sd: null, // start date of the cheapest itinearary
                                ed: null, // end date of the cheapest itinearary
                                price: Infinity, // price of the cheapest itinearary
                                toduration: null, // onward journey duration of the cheapest itinearary
                                froduration: null, // return journey duration of the cheapest itinearary
                                airlines: null // name of the airlines of the cheapest itinearary
                            };
                            var source, destination;
                            if (!body.itineraries) {
                                if (D) {
                                    // StudentUniverse couldnt find results for a source - destination - start date - end date combination 
                                    console.log(counter, 'Couldnt find itineraries for a combination');
                                };
                            } else {
                                // Find the cheapest itinerary from the list of ititneraries returned
                                for (var i = 0; i < body.itineraries.length; i++) {
                                    var itinerary = body.itineraries[i];
                                    if (itinerary.total < cheapest_itinerary.price) {
                                        // Set all the fields of the cheapest itinerary so far
                                        cheapest_itinerary.sd = itinerary.legs[0].departureTime;
                                        cheapest_itinerary.ed = itinerary.legs[itinerary.legs.length - 1].departureTime;
                                        cheapest_itinerary.price = itinerary.total;

                                        source = itinerary.legs[0].departureAirport;
                                        destination = itinerary.legs[0].arrivalAirport;

                                        cheapest_itinerary.toduration = (itinerary.legs[0].duration / 60).toFixed(2);
                                        cheapest_itinerary.froduration = (itinerary.legs[1].duration / 60).toFixed(2);

                                        cheapest_itinerary.airlines = itinerary.carrierDescription;
                                    }
                                }
                                // Add the key of the form 'source-destination' if not present and initialize. Eg: LAX-BLR
                                comparison_table[source + '-' + destination] =
                                    comparison_table[source + '-' + destination] || [];
                                comparison_table[source + '-' + destination].push(cheapest_itinerary);
                                // print the output in CSV format on console
                                console.log([counter, source + '-' + destination, cheapest_itinerary.sd, cheapest_itinerary.ed,
                                    cheapest_itinerary.price, cheapest_itinerary.toduration,
                                    cheapest_itinerary.froduration, cheapest_itinerary.airlines
                                ].join(','));

                                if (counter >= total_combinations) {
                                    console.log('Done processing all requests');
                                    deferred.resolve(comparison_table);
                                };
                                deferred.notify(counter / total_combinations);
                            }
                        }
                        counter += 1;
                    });
                }
            }
        }
    }

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
            "table": {
                "PHX-DEL": [{
                    "sd": "2015-12-24T13:10:00",
                    "ed": "2016-01-16T04:25:00",
                    "price": 1654.99,
                    "toduration": "25.17",
                    "froduration": "31.15",
                    "airlines": "Multiple Airlines"
                }]
            }
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
            }, function(progress) {
                console.log("progress", progress);
                res.write(Math.random() * 100);
            });
    });
}
