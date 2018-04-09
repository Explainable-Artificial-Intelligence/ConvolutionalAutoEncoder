/*
function to create a summary tile for tuning
 */

function SummaryTile(parentID, uuid) {
    // functions:
    this.markAsFinished = function (aborted) {
        /*
        marks tile as trained
         */
        console.log("mark as finished");
        console.log(aborted);
        // mark div as trained (css modifications)
        if (aborted) {
            tile.classList.add("aborted");
        } else {
            tile.classList.add("trained");
        }
        // display final cost and steps:
        var finalStats = document.createElement("div");

        var finalCost = document.createElement("p");
        finalCost.textContent = "Final Cost: " + this.costChart.getLatestValue('cost');
        finalStats.appendChild(finalCost);

        var br = document.createElement('br');
        finalStats.appendChild(br);
        finalStats.appendChild(br);
        var finalSteps = document.createElement("p");
        finalSteps.textContent += "Steps: " + this.costChart.getLatestStep('cost');
        finalStats.appendChild(finalSteps);


        fourthCell.appendChild(finalStats);
    };

    // set property variables
    this.uuid = uuid;

    // create tile:
    var parentNode = document.getElementById(parentID);

    var tile = document.createElement("div");
    tile.className = 'SummaryTile columnDiv';
    tile.id = "summaryTile_" + uuid;

    parentNode.appendChild(tile);

    // create table
    var table = document.createElement("table");
    tile.appendChild(table);

    var firstCell = document.createElement("td");
    firstCell.classList.add("summaryColumn");
    firstCell.id = "firstCell_" + uuid;
    table.appendChild(firstCell);

    var secondCell = document.createElement("td");
    secondCell.classList.add("summaryColumn");
    secondCell.id = "secondCell_" + uuid;
    table.appendChild(secondCell);

    var thirdCell = document.createElement("td");
    thirdCell.classList.add("summaryColumn");
    thirdCell.id = "thirdCell_" + uuid;
    table.appendChild(thirdCell);

    var fourthCell = document.createElement("td");
    fourthCell.classList.add("summaryColumn");
    fourthCell.id = "fourthCell_" + uuid;
    table.appendChild(fourthCell);

    // create columns:
    // var leftColumn = document.createElement("div");
    // leftColumn.className = "leftColumn";
    // leftColumn.id = "leftColumn_" + uuid;
    // tile.appendChild(leftColumn);
    // var rightColumn = document.createElement("div");
    // rightColumn.className = "rightColumn";
    // rightColumn.id = "rightColumn_" + uuid;
    // tile.appendChild(rightColumn);

    // add charts
    this.costChart = new LineChart(firstCell.id, 250, 250, "cost", {'cost': 'lightblue'});
    this.learningRateChart = new LineChart(secondCell.id, 250, 250, "learning rate", {'learning rate': 'lightblue'});

    // add image grid:
    this.imageGrid = document.createElement("table");
    this.imageGrid.classList.add("imageGrid");
    var scrollPane = document.createElement("div");
    scrollPane.classList.add("scrollPane");
    scrollPane.appendChild(this.imageGrid);
    thirdCell.appendChild(scrollPane);


    //     = document.createElement("div");
    // this.imageGrid.className = 'columns';
    // tile.appendChild(this.imageGrid);
}