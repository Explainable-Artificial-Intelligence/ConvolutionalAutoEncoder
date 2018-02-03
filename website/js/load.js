/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var loadApi = new ConvolutionalAutoencoder.LoadApi();


function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

loadApi.resetAllBatchIndices(callback);


function loadFile() {

    // get all input fields
    var filename = document.getElementById("inputFilePath").value;
    var datasetname = document.getElementById("inputDatasetName").value;
    var readLabels = document.getElementById("readLabels").options[document.getElementById("readLabels").selectedIndex].value === true;
    var dataType = document.getElementById("dataType").options[document.getElementById("dataType").selectedIndex].value;

    // call swagger client
    var api = new ConvolutionalAutoencoder.LoadApi();
    console.log(api.loadFile(filename, datasetname, readLabels, dataType));

}

function appendImages() {
    // get image grid
    var imageGrid = document.getElementById("imageGrid");

    // load next Image batch through swagger client
    //var loadApi = new ConvolutionalAutoencoder.LoadApi();

    function imageCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log('API called successfully.');
            //console.log(response);
            console.log(data);

            // iterate over all images
            for (var i = 0; i < data.images.length; i++) {
                // create new image object
                var newImage = document.createElement("img");
                newImage.id = "Image_" + data.images[i].id;
                newImage.src = "data:image/png;base64," + data.images[i].bytestring.substring(2, data.images[i].bytestring.length - 1);
                newImage.class = "imageThumbnail";
                // add eventListener
                // change preview view
                newImage.addEventListener("click", function () {
                    console.log(this.id);
                    document.getElementById("imagePreview").src = this.src;
                });


                // append new image to image grid
                imageGrid.appendChild(newImage);
            }
        }
    }

    loadApi.getImageBatch({"batchSize": 300}, imageCallback);

}

/*
Attach button events
 */

document.getElementById("loadBtn").addEventListener("click", loadFile);

document.getElementById("showImagesBtn").addEventListener("click", appendImages);
