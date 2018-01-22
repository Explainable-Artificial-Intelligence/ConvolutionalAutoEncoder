var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var trainApi = new ConvolutionalAutoencoder.TrainApi();

var startTraining = function () {

    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;
        }
    };
    trainApi.controlTraining({trainStatus:"start"}, callback);
};


var stopTraining = function () {

    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;
        }
    };
    trainApi.controlTraining("stop", callback);
};


/*
attach Event Listener
 */

document.getElementById("startTraining").addEventListener("click", startTraining);
document.getElementById("stopTraining").addEventListener("click", stopTraining);
