/*
function to create a summary tile for tuning
 */

function SummaryTile(parentID, uuid, trainImageCount) {
    // functions:
    function generateParameterList(list, parameterList) {
        list.appendChild(document.createTextNode("Parameter List:"));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createElement("br"));

        list.appendChild(document.createTextNode("Activation function: " + parameterList["activation_function"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Batch size: " + parameterList["batch_size"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Cost function: " + parameterList["cf_cost_function"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Filter sizes: " + parameterList["filter_sizes"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Input shape: " + parameterList["input_shape"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Learning rate function: " + parameterList["learning_rate_function"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Initial learning rate: " + parameterList["lr_initial_learning_rate"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Mirror weights: " + parameterList["mirror_weights"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Momentum: " + parameterList["momentum"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Epochs: " + parameterList["n_epochs"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Number of stacks: " + parameterList["number_of_stacks"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Optimizer: " + parameterList["optimizer"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Number of test Images: " + parameterList["num_test_pictures"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Initial biases: " + parameterList["random_function_for_biases"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Initial weights: " + parameterList["random_function_for_weights"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Min. initial weight: " + parameterList["rw_minval"]));
        list.appendChild(document.createElement("br"));
        list.appendChild(document.createTextNode("Max. initial weight: " + parameterList["rw_maxval"]));
        list.appendChild(document.createElement("br"));


        /*for (var parameterName in parameterList) {
            // check if the property/key is defined in the object itself, not in parent
            if (parameterList.hasOwnProperty(parameterName)) {

                list.appendChild(document.createTextNode(parameterName + ": " + parameterList[parameterName]));
                list.appendChild(document.createElement("br"));


            }
        }*/
    }

    this.markAsFinished = function (aborted) {
        if (finished) {
            return;
        }
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

        // add cost
        var finalCost = document.createElement("p");
        finalCost.textContent = "Final Cost: " + this.costChart.getLatestYValue('cost');
        finalStats.appendChild(finalCost);

        var br = document.createElement('br');
        finalStats.appendChild(br);
        finalStats.appendChild(br);

        // add steps
        var finalSteps = document.createElement("p");
        finalSteps.textContent += "Steps: " + this.costChart.getLatestXValue('cost');
        finalStats.appendChild(finalSteps);

        // add button to apply as default ann
        this.applyButton = document.createElement("button");
        this.applyButton.textContent = "Use as Default model";
        finalStats.appendChild(this.applyButton);


        //append div to column
        fifthCell.appendChild(finalStats);

        finished = true;
    };

    this.setParameterList = function (parameterList) {
        console.log(parameterList);

        var list = document.createElement("div");
        list.id = "parameterList_" + this.uuid;
        thirdCell.appendChild(list);

        generateParameterList(list, parameterList);
    };


    // set property variables
    this.uuid = uuid;
    var finished = false;

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

    var fifthCell = document.createElement("td");
    fifthCell.classList.add("summaryColumn");
    fifthCell.id = "fifthCell_" + uuid;
    table.appendChild(fifthCell);

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
    this.costChart = new LineChart(firstCell.id, 250, 250, "step", "cost", "steps", "cost", {'cost': 'lightblue'});
    this.learningRateChart = new LineChart(secondCell.id, 250, 250, "step", "currentLearningRate", "steps",
        "learning rate", {'learning rate': 'lightblue'});

    // add image grid:
    this.imageGrid = new ImageGrid(fourthCell, trainImageCount);


    //     = document.createElement("div");
    // this.imageGrid.className = 'columns';
    // tile.appendChild(this.imageGrid);
}