var express = require('express');
var app = express();
var request = require('request').defaults({
    jar: true
});


app.get('/', function(req, res) {
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

    var table = {};
    var sources = ['LAX', 'CHI'],
        destinations = ['BOM', 'HYD'];
    var startDates = ['2015-12-16T00:00:00.000', '2015-12-17T00:00:00.000'],
        endDates = ['2016-01-10T00:00:00.000', '2016-01-11T00:00:00.000'];
    for (var isource = 0; isource < sources.length; isource++) {
        for (var idestination = 0; idestination < destinations.length; idestination++) {
            table[sources[isource] + "-" + destinations[idestination]] = [];
            for (var isd = 0; isd < startDates.length; isd++) {
                for (var ied = 0; ied < endDates.length; ied++) {
                    data.tripElements[0].dateTime = startDates[isd]; // set start date
                    data.tripElements[0].origin = sources[isource]; // set origin for onward
                    data.tripElements[0].destination = destinations[idestination]; // set destination for onward

                    data.tripElements[1].dateTime = endDates[ied]; // set end date
                    data.tripElements[1].origin = destinations[idestination]; // set origin for return
                    data.tripElements[1].destination = sources[isource]; // set destination for return

                    request({
                        method: 'POST',
                        uri: url,
                        body: data,
                        json: true
                    }, function(error, response, body) {
                        if (error) {
                            console.log('error');
                            res.status(500).send("Error in POST call");
                        } else {
                            var cheapest_itinerary = {
                                sd: null,
                                ed: null,
                                price: Infinity
                            };
                            var source, destination;
                            if (!body.itineraries) {
                                console.log('Couldnt find itineraries for a combination');
                                return;
                            };
                            for (var i = 0; i < body.itineraries.length; i++) {
                                var itinerary = body.itineraries[i];
                                if (itinerary.total < cheapest_itinerary.price) {
                                    cheapest_itinerary.sd = itinerary.legs[0].departureTime;
                                    cheapest_itinerary.ed = itinerary.legs[itinerary.legs.length - 1].departureTime;
                                    cheapest_itinerary.price = itinerary.total;

                                    source = itinerary.legs[0].departureAirport;
                                    destination = itinerary.legs[0].arrivalAirport;
                                }
                            }
                            // console.log(source + '-' + destination);
                            if (!table[source + '-' + destination]) {
                                table[source + '-' + destination] = [];
                            };
                            table[source + '-' + destination].push(cheapest_itinerary);
                            // console.log('table', table);
                            // console.log(source + '-' + destination, JSON.stringify(cheapest_itinerary));
                            console.log([source + '-' + destination, cheapest_itinerary.sd, cheapest_itinerary.ed, cheapest_itinerary.price].join(','));
                            // console.log('\n\n')
                        }
                    });
                }
            }
        }
    }

    res.send("Done")
});

var server = app.listen(3000, function() {
    var port = server.address().port;
    console.log('Example app listening at http://localhost:%s', port);
});
