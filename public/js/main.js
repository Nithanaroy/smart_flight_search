$(function() {
    $("#track-btn").click(function() {
        updateAlertMsg('Fetching results...');
        $.ajax({
            url: '/fetchPriceTable',
            method: 'post',
            data: $("form").serialize(),
            success: function(data) {
                var priceTable = data.table;
                for (var itrip in priceTable) {
                    var tr = $("<tr />");
                    var srcDest = $("<td />").text(priceTable[itrip].sourceDestination);
                    var startDate = $("<td />").text(priceTable[itrip].sd);
                    var endDate = $("<td />").text(priceTable[itrip].ed);
                    var price = $("<td />").text(priceTable[itrip].price);
                    var toduration = $("<td />").text(priceTable[itrip].toduration);
                    var froduration = $("<td />").text(priceTable[itrip].froduration);
                    var airlines = $("<td />").text(priceTable[itrip].airlines);

                    $(tr).append(srcDest).append(startDate).append(endDate).append(price)
                        .append(toduration).append(froduration).append(airlines);
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
