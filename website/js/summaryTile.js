/*
function to create a summary tile for tuning
 */

function SummaryTile(parentID, uuid) {
    // set property variables
    this.uuid = uuid;

    // create tile:
    var parentNode = document.getElementById(parentID);

    var tile = document.createElement("div");
    tile.id = "summaryTile_" + uuid;

    parentNode.appendChild(tile);

    // add charts
    this.costChart = new LineChart(tile.id, 250, 250, "cost");
    this.learningRateChart = new LineChart(tile.id, 250, 250, "learning rate");
}