var express = require('express');
var app = express();
var request = require('request').defaults({
    jar: true
});


app.get('/', function(req, res) {
    var url = 'https://www.studentuniverse.com/wapi/flightsWapi/searchFlightsSpanned';
    //var data = '{ "tripElements": [{ "origin": "LAX", "destination": "HYD", "dateTime": "2015-12-16T00:00:00.000" }, { "origin": "HYD", "destination": "LAX", "dateTime": "2016-01-11T00:00:00.000" }], "numberOfPassengers": 1, "details": false, "searchStartTime": "2015-09-16T16:41:11.789", "lowestPrice": null, "source": "home", "phoneInDiscountCode": null, "searchKey": null }'
    var data = { "tripElements": [{ "origin": "LAX", "destination": "HYD", "dateTime": "2015-12-16T00:00:00.000" }, { "origin": "HYD", "destination": "LAX", "dateTime": "2016-01-11T00:00:00.000" }], "numberOfPassengers": 1, "details": false, "searchStartTime": "2015-09-16T16:41:11.789", "lowestPrice": null, "source": "home", "phoneInDiscountCode": null, "searchKey": null }

    request({
        method: 'POST',
        uri: url,
        'body': data,
        json: true
    }, function(error, response, body) {
        if (error) {
            console.log('error');
            res.status(500).send("Error in POST call");
        } else {
            console.log('server encoded the data as: ' + (response.headers['content-encoding'] || 'identity'))
                // console.log(body)
                // console.log(response)
        }
        res.send(body);
    });
});

var server = app.listen(3000, function() {
    var port = server.address().port;
    console.log('Example app listening at http://localhost:%s', port);
});
