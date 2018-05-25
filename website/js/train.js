/*
Includes
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

/*
Global variables
 */
var trainApi = new ConvolutionalAutoencoder.TrainApi();
var loadApi = new ConvolutionalAutoencoder.LoadApi();
var buildApi = new ConvolutionalAutoencoder.BuildApi();


/*
API test
 */
function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

loadApi.resetAllBatchIndices(callback);

/*
Global variables
 */
var trainTimer;
var currentTrainImageEpoch = 0;
var datasetname = "train_data";
var inputShape = [1, 1, 1, 1];
var annInputShape = [1, 1, 1, 1];

/*
Helper function
 */
function getAnnInputDimension() {
    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log('parameter set received');
            console.log(data);
            annInputShape = data.input_shape[0];
        }
    }

    buildApi.getANNParameter(callback);
}

function getInputDimensions() {


    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(data);

            //update data statistics:
            document.getElementById("labelResolution").textContent = "Resolution: " + data[1] + "px x " + data[2] + "px";
            document.getElementById("labelLayer").textContent = "Layer: " + data[3];
            document.getElementById("labelNumberOfImages").textContent = "Number of Images: " + data[0];

            //update input shape:
            inputShape = data;

            // add placeholder for first dim:
            inputShape[0] = -1;
        }
    }

    buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
}

function getAvailableDataSets() {
    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log('loaded data sets retrieved');
            // replace options in 'Loaded data sets' selection
            console.log(data);
            var selection = document.getElementById("inputLoadedDataSets");
            // remove previous options
            selection.options.length = 0;
            // add available file names
            for (var i = 0; i < data.length; i++) {
                selection.options[i] = new Option(data[i], data[i], false, false)
                checkInputDimensions(selection.options[i]);
            }
            // select first element:
            selection.options[0].selected = true;
            selectLoadedDataset();
        }
    }

    loadApi.getLoadedDataSets(callback);
}

function checkInputDimensions(option) {
    // disable option to prevent errors:
    option.disabled = true;

    // activate again if
    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(data);
            console.log(annInputShape);

            // disable option if input shape doesn't fit the ANN:

            if (data[1] === annInputShape[1]) {
                if (data[2] === annInputShape[2]) {
                    if (data[3] === annInputShape[3]) {
                        option.disabled = false;
                    }
                }
            }
        }
    }

    buildApi.getInputShape({'datasetName': option.value}, inputShapeCallback)


}

function selectLoadedDataset() {
    datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
    getInputDimensions();
}

/*
Charts
 */
var costChart = new LineChart("charts", 500, 500, "step", "cost", "steps", "cost", {'cost': 'lightblue'});
// add line break
document.getElementById("charts").appendChild(document.createElement("br"));
var learningRateChart = new LineChart("charts", 500, 500, "step", "currentLearningRate", "steps", "learning rate",
    {'learning rate': 'lightblue'});
// add line break
document.getElementById("charts").appendChild(document.createElement("br"));
var epochImages = new ImageGrid(document.getElementById("charts"), 9);


function updateTrainImages() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log(response);
            //console.log(data);

            //get image pane
            var imageGrid = document.getElementById("imageGrid");

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
                newInputImage.style.width = "160px";
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
                    newLatentImage.style.width = "40px";
                    newLatentImage.class = "imageThumbnail";
                    // append new image div to image grid
                    latentCell.appendChild(newLatentImage);
                    if ((j + 1) % 4 === 0) { //Math.ceil(Math.sqrt(data.latentLayer[i].length))
                        latentCell.appendChild(document.createElement('br'));
                    }

                }
                // append new image div to image grid
                tableRow.appendChild(latentCell);


                /*// add eventListener
                // change preview view
                newInputImage.addEventListener("click", function () {
                    console.log(this.id);
                    document.getElementById("imagePreview").src = this.src;
                });*/

                // create cell for input image
                var outputCell = document.createElement("td");
                // create new output image object
                var newOutputImage = document.createElement("img");
                newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
                newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2,
                    data.outputLayer[i].bytestring.length - 1);
                newOutputImage.style.width = "160px";
                newOutputImage.class = "imageThumbnail";

                // append new image to image grid
                outputCell.appendChild(newOutputImage);
                tableRow.appendChild(outputCell);

                imageGrid.appendChild(tableRow);


            }

            //add images epochwise
            if (data.epoch > currentTrainImageEpoch) {

                //create new column:
                epochImages.addNewImageColumn(data);

                currentTrainImageEpoch = data.epoch;
            }


        }
    };
    trainApi.getProcessedImageData(9, callback);
}

function updateTrainStatistics() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {

            //update cost diagram
            if (data.train_performance_data.length > 0) {
                costChart.appendData({'cost': data.train_performance_data});
                learningRateChart.appendData({'learning rate': data.train_performance_data});
            }

            if (data.train_status === "finished") {
                // stop update timer
                clearInterval(trainTimer);

                // print status
                console.log("Training finished");
                console.log("Final step: " + costChart.getLatestXValue('cost'));
                document.getElementById("responseLabel").textContent = "Training finished.  Final step: "
                    + costChart.getLatestXValue('cost');
            }

        }


    };

    trainApi.getTrainPerformance(callback);
}

function updateView() {
    // update train images:
    updateTrainImages();

    // update charts:
    updateTrainStatistics();
}

function startTraining() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);

            // abort if no model is available:
            if (response.statusCode === 204) {
                document.getElementById("responseLabel").textContent = "No CAE model available to train";
                return;
            }

            document.getElementById("responseLabel").textContent = response.text;
            // start update timer
            trainTimer = setInterval(updateView, 500);
        }
    }

    trainApi.controlTraining('"start"', {"datasetName": datasetname}, callback);
}

function stopTraining() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;

            // stop update timer
            clearInterval(trainTimer);
        }
    }

    trainApi.controlTraining('"stop"', callback);
}


/*
attach Event Listener
 */
document.getElementById("inputLoadedDataSets").addEventListener("change", selectLoadedDataset);
document.getElementById("startTraining").addEventListener("click", startTraining);
document.getElementById("stopTraining").addEventListener("click", stopTraining);

getAnnInputDimension();
getAvailableDataSets();




