/*
Includes
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

/*
Global variables
 */
var trainApi = new ConvolutionalAutoencoder.TrainApi();
var loadApi = new ConvolutionalAutoencoder.LoadApi();


var trainTimer;

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
Charts
 */

var costChart = new LineChart("charts", 500, 500, "cost", {'cost': 'lightblue'});
var learningRateChart = new LineChart("charts", 500, 500, 'learning rate', {'learning rate': 'lightblue'});

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


        }
    };
    trainApi.getProcessedImageData(9, callback);
}

function updateTrainStatistics() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            // console.log(response);
            // console.log(data);
            console.log(data.train_status);

            //update cost diagram
            if (data.cost.length > 0) {
                costChart.appendData({'cost': data.cost});
                learningRateChart.appendData({'learning rate': data.currentLearningRate});
            }

            if (data.train_status === "finished") {
                // stop update timer
                clearInterval(trainTimer);

                // print status
                console.log("Training finished");
                console.log("Final step: " + costChart.getLatestStep('cost'));
                document.getElementById("responseLabel").textContent = "Training finished.  Final step: "
                    + costChart.getLatestStep('cost');
            }

        }


    };

    trainApi.getTrainPerformance(callback);
}

function updateView() {
    console.log("tick");
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
            document.getElementById("responseLabel").textContent = response.text;

            // start update timer
            trainTimer = setInterval(updateView, 500);
        }
    }

    trainApi.controlTraining('"start"', callback);
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

document.getElementById("startTraining").addEventListener("click", startTraining);
document.getElementById("stopTraining").addEventListener("click", stopTraining);



