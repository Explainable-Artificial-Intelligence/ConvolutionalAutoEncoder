/*
Includes
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

/*
Global variables
 */
var trainApi = new ConvolutionalAutoencoder.TrainApi();
var trainTimer;

function updateTrainImages() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);

            //get image pane
            var imageGrid = document.getElementById("imageGrid");

            // remove all previous elements:
            imageGrid.innerHTML = "";

            // add image pairs
            for (var i = 0; i < data.inputLayer.length; i++) {
                // create new input image object
                var newInputImage = document.createElement("img");
                newInputImage.id = "InputImage_" + data.inputLayer[i].id;
                newInputImage.src = "data:image/png;base64," + data.inputLayer[i].bytestring.substring(2, data.inputLayer[i].bytestring.length - 1);
                newInputImage.style.width = "80px";
                newInputImage.class = "imageThumbnail";

                // append new image to image grid
                imageGrid.appendChild(newInputImage);

                /*// add eventListener
                // change preview view
                newInputImage.addEventListener("click", function () {
                    console.log(this.id);
                    document.getElementById("imagePreview").src = this.src;
                });*/

                // create new output image object
                var newOutputImage = document.createElement("img");
                newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
                newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2, data.outputLayer[i].bytestring.length - 1);
                newOutputImage.style.width = "80px";
                newOutputImage.class = "imageThumbnail";

                // append new image to image grid
                imageGrid.appendChild(newOutputImage);

                //append line break:
                imageGrid.appendChild(document.createElement('br'));

            }


        }
    };
    trainApi.getProcessedImageData(9, callback);
}

function updateView() {
    console.log("tick");
    // update train images:
    updateTrainImages();
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
            trainTimer = setInterval(updateView, 5000);
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
