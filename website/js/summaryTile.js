/*
function to create a summary tile for tuning
 */

function SummaryTile(parentID, uuid) {
    // functions:
    this.markAsTrained = function () {
        /*
        marks tile as trained
         */
        // mark div as trained (css modifications)
        tile.classList.add("trained");
        //tile.style.border = "5px lime";

        // display final cost and steps:
        var finalStats = document.createElement("div");

        var finalCost = document.createElement("p");
        finalCost.textContent = "Final Cost: " + this.costChart.getLatestValue();
        finalStats.appendChild(finalCost);

        var br = document.createElement('br');
        finalStats.appendChild(br);
        finalStats.appendChild(br);
        var finalSteps = document.createElement("p");
        finalSteps.textContent += "Steps: " + this.costChart.getLatestStep();
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
    firstCell.id = "firstCell_" + uuid;
    table.appendChild(firstCell);

    var secondCell = document.createElement("td");
    secondCell.id = "secondCell_" + uuid;
    table.appendChild(secondCell);

    var thirdCell = document.createElement("td");
    thirdCell.id = "thirdCell_" + uuid;
    table.appendChild(thirdCell);

    var fourthCell = document.createElement("td");
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
    this.imageGrid = thirdCell
    //     = document.createElement("div");
    // this.imageGrid.className = 'columns';
    // tile.appendChild(this.imageGrid);
}