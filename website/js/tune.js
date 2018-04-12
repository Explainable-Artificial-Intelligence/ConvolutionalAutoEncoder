/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var tuneApi = new ConvolutionalAutoencoder.TuneApi();
var buildApi = new ConvolutionalAutoencoder.BuildApi();

// check API functionality
function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}


/*
Convolutional Auto Encoder topology
 */

/*
Global variables
 */
var updateTimer;
var currentTile = null;
var previousTiles = [];

/*
Helper functions
 */
function convertToCamelCase(inputString) {
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
    var outputString = "";
    var array = inputString.split(' ');
    for (var i = 0; i < array.length; i++) {
        outputString += array[i].capitalize();
    }
    console.log(outputString);
    return outputString;
}

function read3OptionList(id) {
    var selection = document.getElementById(id).options[document.getElementById(id).selectedIndex].value;
    switch (selection) {
        case "true":
            return [true];
        case "false":
            return [false];
        default:
            return [true, false]
    }
}

function parseInputList(id, convertToNumber) {
    var inputText = document.getElementById(id).value.trim();
    if (inputText.startsWith('[')) {
        // parse as list
        return JSON.parse(inputText);
    } else if (inputText.startsWith('(')) {
        // parse as tuple:
        // code from
        // https://stackoverflow.com/questions/31232952/how-to-extract-tuples-string-into-data-structure
        var tuple = JSON.parse("[" + inputText.replace(/\(/g, "[").replace(/\)/g, "]") + "]");
        console.log(tuple);
        // iterate over range
        var range = [];
        for (var i = tuple[0][0]; i < tuple[0][1]; i += tuple[0][2]) {
            range.push(i);
        }
        return range;
    } else {
        //parse as single entry
        if (convertToNumber) {
            return [Number(inputText)];
        } else {
            return [inputText]
        }
    }

}

function readActivationFunctions() {
    var selectedFunctions = [];
    var table = document.getElementById("activationFunctionTable");
    // iterate over all checkboxes:
    for (var i = 0; i < table.rows[2].cells.length; i++) {
        if (table.rows[2].cells[i].children[0].checked) {
            selectedFunctions.push(table.rows[0].cells[i].textContent);
        }
    }
    console.log(selectedFunctions);
    return selectedFunctions;
}

function readLearningRateFunctions() {
    var selectedFunctions = [];
    var table = document.getElementById("learningRateFunctionTable");
    // iterate over all checkboxes:
    for (var i = 0; i < table.rows[2].cells.length; i++) {
        if (table.rows[2].cells[i].children[0].checked) {
            // create new dict:
            var learningRateDict = new ConvolutionalAutoencoder.LearningRate();
            var functionName = table.rows[0].cells[i].textContent;

            // add additional parameters:
            switch (functionName) {
                case "static":
                    learningRateDict.learning_rate_function = "static";
                    learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateStatic", true);
                    break;
                case "exponential decay":
                    learningRateDict.learning_rate_function = "exponential_decay";
                    learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateExpDecay", true);
                    learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsExpDecay", true);
                    learningRateDict.lr_decay_rate = parseInputList("lrDecayRateExpDecay", true);
                    learningRateDict.lr_staircase = read3OptionList("lrStaircaseExpDecay");
                    break;
                case "inverse time decay":
                    learningRateDict.learning_rate_function = "inverse_time_decay";
                    learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateInvTimeDecay", true);
                    learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsInvTimeDecay", true);
                    learningRateDict.lr_decay_rate = parseInputList("lrDecayRateInvTimeDecay", true);
                    learningRateDict.lr_staircase = read3OptionList("lrStaircaseInvTimeDecay");
                    break;
                case "natural exp decay":
                    learningRateDict.learning_rate_function = "natural_exp_decay";
                    learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateNatExpDecay", true);
                    learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsNatExpDecay", true);
                    learningRateDict.lr_decay_rate = parseInputList("lrDecayRateNatExpDecay", true);
                    learningRateDict.lr_staircase = read3OptionList("lrStaircaseNatExpDecay");
                    break;
                case "piecewise constant":
                    learningRateDict.learning_rate_function = "piecewise_constant";
                    learningRateDict.lr_boundaries = parseInputList("lrBoundariesPiecewiseConstant", true);
                    learningRateDict.lr_values = parseInputList("lrValuesPiecewiseConstant", true);
                    break;
                case "polynomial decay":
                    learningRateDict.learning_rate_function = "polynomial_decay";
                    learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRatePolynomDecay", true);
                    learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsPolynomDecay", true);
                    learningRateDict.lr_end_learning_rate = parseInputList("lrEndLearningRatePolynomDecay", true);
                    learningRateDict.lr_power = parseInputList("lrPowerPolynomDecay", true);
                    learningRateDict.lr_cycle = read3OptionList("lrCyclePolynomDecay");
                    break;
            }

            // add dict to list
            selectedFunctions.push(learningRateDict);
        }
    }
    console.log(selectedFunctions);
    return selectedFunctions;
}

function readOptimizerFunctions() {
    var selectedFunctions = [];
    var table = document.getElementById("optimizerTable");
    // iterate over all checkboxes:
    for (var i = 0; i < table.rows[2].cells.length; i++) {
        if (table.rows[2].cells[i].children[0].checked) {
            selectedFunctions.push(convertToCamelCase(table.rows[0].cells[i].textContent));
        }
    }
    console.log(selectedFunctions);
    return selectedFunctions;
}

function readCostFunctions() {
    var selectedFunctions = [];
    var table = document.getElementById("costFunctionTable");
    // iterate over all checkboxes:
    for (var i = 0; i < table.rows[2].cells.length; i++) {
        if (table.rows[2].cells[i].children[0].checked) {
            // create new dict:
            var costFunctionDict = new ConvolutionalAutoencoder.CostFunction();
            var functionName = table.rows[0].cells[i].textContent;

            // add additional parameters:
            switch (functionName) {
                case "squared pixel distance":
                    costFunctionDict.cf_cost_function = "squared_pixel_distance";
                    break;
                case "pixel distance":
                    costFunctionDict.cf_cost_function = "pixel_distance";
                    break;
                // to be continued...
            }

            // add dict to list
            selectedFunctions.push(costFunctionDict);
        }
    }
    console.log(selectedFunctions);
    return selectedFunctions;
}

function readRandomFunctions(id, prefix) {
    var selectedFunctions = [];
    var table = document.getElementById(id);
    // iterate over all checkboxes:
    for (var i = 0; i < table.rows[2].cells.length; i++) {
        if (table.rows[2].cells[i].children[0].checked) {
            // create new dict:
            var randomFunction = new ConvolutionalAutoencoder.RandomFunction();
            var functionName = table.rows[0].cells[i].textContent;

            // add additional parameters:
            randomFunction.random_function = functionName;
            switch (functionName) {
                case "zeros":
                    break;
                case "gamma":
                    randomFunction.alpha = parseInputList(prefix + "GammaAlpha", true);
                    randomFunction.beta = parseInputList(prefix + "GammaBeta", true);
                    randomFunction.seed = parseInputList(prefix + "GammaSeed", true);
                    break;
                case "normal":
                    randomFunction.mean = parseInputList(prefix + "NormalMean", true);
                    randomFunction.stddev = parseInputList(prefix + "NormalStddev", true);
                    randomFunction.seed = parseInputList(prefix + "NormalSeed", true);
                    break;
                case "poisson":
                    randomFunction.lam = parseInputList(prefix + "PoissonLam", true);
                    randomFunction.seed = parseInputList(prefix + "PoissonSeed", true);
                    break;
                case "uniform":
                    randomFunction.minval = parseInputList(prefix + "UniformMinval", true);
                    randomFunction.maxval = parseInputList(prefix + "UniformMaxval", true);
                    randomFunction.seed = parseInputList(prefix + "UniformSeed", true);
                    break;
            }

            // add dict to list
            selectedFunctions.push(randomFunction);
        }
    }
    console.log(selectedFunctions);
    return selectedFunctions;
}

function finishSummaryTile(currentTile) {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            // console.log(response);
            // console.log(data);

            // finish old summary tile:

            // update charts:
            currentTile.costChart.replaceData({'cost': data.train_performance_data});
            currentTile.learningRateChart.replaceData({'learning rate': data.train_performance_data});

            //mark tile as completely trained
            currentTile.markAsFinished(!(data.train_status === "finished" || data.train_status === "running"));
        }


    };

    tuneApi.getTrainPerformanceOfSpecificTuning(currentTile.uuid, callback);
}


/*
Main building functions
 */

// get input (output) dimensions
function getInputDimensions() {


    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log('API called successfully.');
            //console.log(response);
            // console.log(data);


            //update input shape:
            var inputShape = data;

            // add placeholder for first dim:
            inputShape[0] = -1;

            // update topology input output layers:
            // console.log(inputShape);
            document.getElementById("InputShape").value = JSON.stringify([inputShape], null, 1);

        }
    }

    buildApi.getInputShape([], inputShapeCallback)
}

function readLearningParameter() {

    var inputParameterList = new ConvolutionalAutoencoder.ParameterList();
    // read general parameters:
    inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
    inputParameterList.verbose = document.getElementById("verbose").checked;
    inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
    inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
    inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];

    //read network topology:
    inputParameterList.input_shape = JSON.parse(document.getElementById("InputShape").value.trim());
    inputParameterList.number_of_stacks = JSON.parse(document.getElementById("NumberOfStacks").value.trim());
    inputParameterList.filter_sizes = JSON.parse(document.getElementById("FilterSizes").value.trim());


    inputParameterList.mirror_weights = read3OptionList("mirrorWeights");
    inputParameterList.batch_size = parseInputList("batchSize", true);
    inputParameterList.n_epochs = parseInputList("nEpochs", true);

    // read functions:
    inputParameterList.activation_function = readActivationFunctions();
    inputParameterList.learning_rate_dict = readLearningRateFunctions();
    inputParameterList.optimizer = readOptimizerFunctions();
    inputParameterList.momentum = parseInputList("Momentum", true);
    inputParameterList.cost_function_dict = readCostFunctions();
    inputParameterList.random_weights_dict = readRandomFunctions("randomFunctionsForWeightsTable", "rw");
    inputParameterList.random_biases_dict = readRandomFunctions("randomFunctionsForBiasesTable", "rb");

    console.log(inputParameterList);
    return inputParameterList;
}

function buildANN() {

    // get learning parameters (sidebar):
    var inputParameters = readLearningParameter();

    console.log(inputParameters);


    /*
        initialize API call
     */
    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            // console.log(data);
            document.getElementById("responseLabel").textContent = response.text;
        }
    }

    console.log(tuneApi);
    tuneApi.buildGridSearchANN(inputParameters, callback);


}


/*
Main tuning functions
 */

function updateTrainImages() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log(response);
            //console.log(data);

            //get image pane
            var imageGrid = currentTile.imageGrid;

            // remove all previous elements:
            imageGrid.innerHTML = "";

            // add image pairs
            for (var i = 0; i < data.inputLayer.length; i++) {
                // create new table row:
                var tableRow = document.createElement("tr");


                // create cell for input image
                var inputCell = document.createElement("td");
                // create new input image object
                var newInputImage = document.createElement("img");
                newInputImage.id = "InputImage_" + data.inputLayer[i].id;
                newInputImage.src = "data:image/png;base64," + data.inputLayer[i].bytestring.substring(2,
                    data.inputLayer[i].bytestring.length - 1);
                newInputImage.style.width = "50px";
                newInputImage.class = "imageThumbnail";

                // append new image to image grid
                inputCell.appendChild(newInputImage);
                tableRow.appendChild(inputCell);

                // create new latent image object
                var latentCell = document.createElement("td");
                for (var j = 0; j < data.latentLayer[i].length; j++) {
                    var newLatentImage = document.createElement("img");
                    newLatentImage.id = "LatentImage_" + data.latentLayer[i][j].id + "_" + j;
                    newLatentImage.src = "data:image/png;base64," + data.latentLayer[i][j].bytestring.substring(2,
                        data.latentLayer[i][j].bytestring.length - 1);
                    newLatentImage.style.width = "20px";
                    newLatentImage.class = "layerThumbnail";
                    // append new image div to image grid
                    latentCell.appendChild(newLatentImage);
                    if ((j + 1) % 4 === 0) { //Math.ceil(Math.sqrt(data.latentLayer[i].length))
                        latentCell.appendChild(document.createElement('br'));
                    }

                }
                // append new image div to image grid
                tableRow.appendChild(latentCell);

                // create cell for input image
                var outputCell = document.createElement("td");
                // create new output image object
                var newOutputImage = document.createElement("img");
                newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
                newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2,
                    data.outputLayer[i].bytestring.length - 1);
                newOutputImage.style.width = "50px";
                newOutputImage.class = "imageThumbnail";

                // append new image to image grid
                outputCell.appendChild(newOutputImage);
                tableRow.appendChild(outputCell);

                imageGrid.appendChild(tableRow);

            }


        }
    };
    tuneApi.getProcessedImageDataOfCurrentTuning(20, callback);
}


function updateTrainStatistics() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            // console.log(response);
            // console.log(data);

            //update tiles
            // special case: first tile:
            if (currentTile === null) {
                // create new tile:
                currentTile = new SummaryTile("summaryTiles", data.model_id);
            } else if (currentTile.uuid !== data.model_id) {
                // finish old summary tile:
                finishSummaryTile(currentTile);

                // store old tile in array:
                previousTiles.push(currentTile);

                // create new tile:
                currentTile = new SummaryTile("summaryTiles", data.model_id);
            }

            //update diagrams
            if (data.train_performance_data.length > 0) {
                currentTile.costChart.appendData({'cost': data.train_performance_data});
                currentTile.learningRateChart.appendData({'learning rate': data.train_performance_data});
            }

            if (data.train_status === "finished" || data.train_status === "aborted" || data.train_status === "aborting") {
                // stop update timer
                clearInterval(updateTimer);
                // finish summary tile
                finishSummaryTile(currentTile);
            }

        }


    };

    tuneApi.getTrainPerformanceOfCurrentTuning(callback);
}

function updateView() {
    // console.log("tick");

    // update charts:
    updateTrainStatistics();

    // update train images:
    updateTrainImages();
}

function startTuning() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;

            // start update timer
            updateTimer = setInterval(updateView, 500);
        }
    }

    // hide learning parameters:
    document.getElementById("LearningParameters").open = false;
    tuneApi.controlTuning('"start"', callback);
}

function stopTuning() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;

            // stop update timer
            clearInterval(updateTimer);
        }
    }

    // show learning parameters:
    document.getElementById("LearningParameters").open = true;
    tuneApi.controlTuning('"stop"', callback);
}


/*
Event Listener
 */
document.getElementById("buildANN").addEventListener("click", buildANN);
document.getElementById("startGridSearch").addEventListener("click", startTuning);
document.getElementById("stopGridSearch").addEventListener("click", stopTuning);
//

/*
on load
 */
// get input shape
getInputDimensions();

// show parameters
document.getElementById("LearningParameters").open = true;


// // get input (output) dimensions
// function getInputDimensions() {
//
//
//     function inputShapeCallback(error, data, response) {
//         if (error) {
//             console.error(error);
//         } else {
//             //console.log('API called successfully.');
//             //console.log(response);
//             console.log(data);
//
//
//             //update input shape:
//             inputShape = data;
//
//             // add placeholder for first dim:
//             inputShape[0] = -1;
//
//             // update topology input output layers:
//             updateInputOutputLayer(inputShape[1], inputShape[2], inputShape[3]);
//
//         }
//     }
//
//     console.log("test");
//     buildApi.getInputShape([], inputShapeCallback)
// }
//
// function updateInputOutputLayer(resX, resY, channels) {
//     //update view:
//     document.getElementById("resXLabel").textContent = resX;
//     document.getElementById("resXLabel2").textContent = resX;
//     document.getElementById("resYLabel").textContent = resY;
//     document.getElementById("resYLabel2").textContent = resY;
//     document.getElementById("channelLabel").textContent = channels;
//     document.getElementById("channelLabel2").textContent = channels;
//
// }

//
// function addLayer(event, filtersize, numStacks) {
//     //read parameters:
//     filtersize = filtersize || 2;
//     numStacks = numStacks || 4;
//     /*
//     get current ANN topology information
//      */
//
//     // get encoder count
//     var encoderCount = document.getElementById("encoder").children.length - 1; // one child is input layer
//
//     /*
//     append Encoder layer
//     */
//     console.log("add encoder");
//
//     // generate div
//     var encoderDiv = document.createElement("div");
//     encoderDiv.id = "encoderLayer_" + (encoderCount + 1);
//     encoderDiv.className = "ANNLayer";
//
//     // generate input fields:
//     var filtersizeInput = document.createElement("input");
//     filtersizeInput.type = "number";
//     filtersizeInput.value = filtersize;
//     filtersizeInput.style.width = "30px";
//     filtersizeInput.id = "filtersizeEL" + (encoderCount + 1);
//
//     var numStacksInput = document.createElement("input");
//     numStacksInput.type = "number";
//     numStacksInput.value = numStacks;
//     numStacksInput.style.width = "30px";
//     numStacksInput.id = "numStacksEL" + (encoderCount + 1);
//
//     // generate remove button:
//     var removeButton = document.createElement("button");
//     removeButton.id = "removeEL" + (encoderCount + 1);
//     removeButton.textContent = "-";
//
//     // append elements to div:
//     encoderDiv.append("Encoder Layer " + (encoderCount + 1) + ": ");
//     encoderDiv.appendChild(document.createElement('br'));
//     encoderDiv.appendChild(document.createElement('br'));
//     encoderDiv.append("Filtersize: ");
//     encoderDiv.appendChild(filtersizeInput);
//     encoderDiv.append(" Number of Stacks: ");
//     encoderDiv.appendChild(numStacksInput);
//     encoderDiv.appendChild(removeButton);
//
//     //append to DOM
//     document.getElementById("encoder").appendChild(encoderDiv);
//
//
//     /*
//     append decoder layer
//     */
//     console.log("add decoder");
//
//     // generate div
//     var decoderDiv = document.createElement("div");
//     decoderDiv.id = "decoderLayer_" + (encoderCount + 1);
//     decoderDiv.className = "ANNLayer";
//
//     // generate labels:
//     var filtersizeLabel = document.createElement("label");
//     filtersizeLabel.textContent = filtersize;
//     filtersizeLabel.id = "filtersizeDL" + (encoderCount + 1);
//
//     var numStacksLabel = document.createElement("label");
//     numStacksLabel.textContent = numStacks;
//     numStacksLabel.id = "numStacksDL" + (encoderCount + 1);
//
//     // append elements to div:
//     decoderDiv.append("Decoder Layer " + (encoderCount + 1) + ": ");
//     decoderDiv.appendChild(document.createElement('br'));
//     decoderDiv.appendChild(document.createElement('br'));
//     decoderDiv.append("Filtersize: ");
//     decoderDiv.appendChild(filtersizeLabel);
//     decoderDiv.append(" Number of Stacks: ");
//     decoderDiv.appendChild(numStacksLabel);
//
//     //append to DOM
//     document.getElementById("decoder").insertBefore(decoderDiv, document.getElementById("decoder").firstChild);
//
//     /*
//     link input fields
//      */
//     filtersizeInput.addEventListener("change", function () {
//         filtersizeLabel.textContent = filtersizeInput.value;
//     });
//     numStacksInput.addEventListener("change", function () {
//         numStacksLabel.textContent = numStacksInput.value;
//     });
//
//     /*
//     attach remove button
//      */
//     removeButton.addEventListener("click", function () {
//         document.getElementById("encoder").removeChild(encoderDiv);
//         document.getElementById("decoder").removeChild(decoderDiv);
//         console.log("layer removed");
//     })
// }
//
// function buildANN() {
//     // get ANN topology:
//     var filterSizes = [];
//     var numStacks = [];
//     var numEncoderLayers = document.getElementById("encoder").childElementCount;
//     console.log(numEncoderLayers);
//     for (var i = 1; i < numEncoderLayers; i++) {
//         // get filtersize of current layer:
//         filterSizes.push(Number(document.getElementById("filtersizeEL" + i).value));
//         // get number of Stacks of current layer
//         numStacks.push(Number(document.getElementById("numStacksEL" + i).value));
//     }
//
//     console.log(inputShape);
//     console.log(filterSizes);
//     console.log(numStacks);
//     // get learning parameters (sidebar):
//     var inputParameters = readLearningParameter();
//
//     // save topology information
//     inputParameters.input_shape = [inputShape];
//     inputParameters.filter_sizes = [filterSizes];
//     inputParameters.number_of_stacks = [numStacks];
//
//     console.log(inputParameters);
//
//
//     /*
//         initialize API call
//      */
//
//     var buildApi = new ConvolutionalAutoencoder.BuildApi();
//
//
//     function callback(error, data, response) {
//         if (error) {
//             console.error(error);
//         } else {
//             console.log(response);
//             console.log(data);
//             document.getElementById("responseLabel").textContent = response.text;
//         }
//     }
//
//     buildApi.buildANN(inputParameters, callback);
//
//
// }
//
//
// /*
// Global variables
//  */
//
// var inputShape = [-1, -1, -1, -1];
//
//

// getInputDimensions();
//
// // add sample ANN
// addLayer(null, 3, 12);
// addLayer(null, 3, 10);
// addLayer(null, 2, 10);
// addLayer(null, 2, 6);






