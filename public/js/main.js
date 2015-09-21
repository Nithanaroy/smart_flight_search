$(function() {
    $("#track-btn").click(function() {
        updateAlertMsg('Fetching results...');
        $("#output").children("tbody").remove(); // remove existing results
        var isOneWay = $("#ed").val().trim().length === 0;

        $.ajax({
            url: '/fetchPriceTable',
            method: 'post',
            data: $("form").serialize(),
            success: function(data) {
                var priceTable = data.table;
                for (var itrip in priceTable) {
                    var tr = $("<tr />");
                    var srcDest = $("<td />").text(priceTable[itrip].source + '-' + priceTable[itrip].destination);
                    var startDateTime = $("<td />").text(priceTable[itrip].sd);
                    var endDateTime = $("<td />").text(priceTable[itrip].ed);
                    var price = $("<td />").text(priceTable[itrip].price);
                    var toduration = $("<td />").text(priceTable[itrip].toduration);
                    var froduration = $("<td />").text(priceTable[itrip].froduration);
                    var airlines = $("<td />").text(priceTable[itrip].airlines);

                    var source = priceTable[itrip].source;
                    var destination = priceTable[itrip].destination;
                    var startDate = priceTable[itrip].sd.split('T')[0];
                    var endDate = priceTable[itrip].ed.split('T')[0];

                    var href = 'https://www.studentuniverse.com/flights/1/' + source + '/' + destination + '/' + startDate;
                    if (!isOneWay) {
                        href += '/' + destination + '/' + source + '/' + endDate;
                    }
                    var link = $("<td />").html(
                        $('<div />').addClass('truncate').html(
                            $("<a />").attr({
                                href: href,
                                target: '_blank'
                            }).text(href)));

                    $(tr).append(srcDest).append(startDateTime).append(endDateTime).append(price)
                        .append(toduration).append(froduration).append(airlines).append(link);
                    $("#output").append(tr);
                }
                updateAlertMsg('Completed!');
            },
            error: function(data) {
                updateAlertMsg('ERROR: ' + JSON.stringify(data));
            }
        })
    });

    var es = new EventSource("/progress");
    var listener = function(event) {
        var type = event.type;
        if (event.type == "message")
            updateAlertMsg((event.data * 100).toFixed(2) + "% done");
    };
    es.addEventListener("open", listener);
    es.addEventListener("message", listener);
    es.addEventListener("error", listener);

    function updateAlertMsg(message) {
        $("#alert-msg").html(message);
    }
});
