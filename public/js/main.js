$(function() {
    $("#track-btn").click(function() {
        updateAlertMsg('Fetching results...');
        $.ajax({
            url: '/fetchPriceTable',
            method: 'post',
            data: $("form").serialize(),
            success: function(data) {
                var priceTable = data.table;
                for (var trip in priceTable) {
                    var tr = $("<tr />");
                    var srcDest = $("<td />").text(trip);
                    var startDate = $("<td />").text(priceTable[trip].sd);
                    var endDate = $("<td />").text(priceTable[trip].ed);
                    var price = $("<td />").text(priceTable[trip].price);
                    var toduration = $("<td />").text(priceTable[trip].toduration);
                    var froduration = $("<td />").text(priceTable[trip].froduration);
                    var airlines = $("<td />").text(priceTable[trip].airlines);

                    $(tr).append(srcDest).append(startDate).append(endDate).append(price)
                        .append(toduration).append(froduration).append(airlines);
                    $("#output").append(tr);
                }
                updateAlertMsg('Done');
            },
            error: function(data) {
                updateAlertMsg('ERROR: ' + JSON.stringify(data));
            },
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                //Upload progress
                xhr.upload.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        //Do something with upload progress
                        console.log(percentComplete);
                    }
                }, false);
                //Download progress
                xhr.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        updateAlertMsg(percentComplete);
                        console.log(percentComplete);
                    }
                }, false);
                return xhr;
            }
        })
    });

    // var es = new EventSource("events.php");
    // var listener = function(event) {
    //     var div = document.createElement("div");
    //     var type = event.type;
    //     div.appendChild(document.createTextNode(type + ": " + (type === "message" ? event.data : es.url)));
    //     document.body.appendChild(div);
    // };
    // es.addEventListener("open", listener);
    // es.addEventListener("message", listener);
    // es.addEventListener("error", listener);

    function updateAlertMsg(message) {
        $("#alert-msg").text(message);
    }
});
