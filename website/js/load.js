/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
var fs = require('fs');
var path = require('path');

var selectedImageId = "";

var loadApi = new ConvolutionalAutoencoder.LoadApi();


function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}


function appendImages(numberOfImages) {
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
                    // remove old border

                    // update preview:
                    var imagePreview = document.getElementById("imagePreview");
                    // remove old border
                    if (imagePreview.linkedId !== "") {
                        document.getElementById(imagePreview.linkedId).style.border = "";
                    }

                    imagePreview.src = this.src;

                    // update histogram:
                    histogram.setImage(this);


                    // mark selected image:
                    this.style.border = "1px solid orange";
                    // save current id in preview
                    imagePreview.linkedId = this.id;
                });


                // append new image to image grid
                imageGrid.appendChild(newImage);
            }
        }
    }

    loadApi.getImageBatch({"batchSize": numberOfImages}, imageCallback);

}

function getAvailableDataSets() {
    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log('Available data sets retrieved');
            // replace options in 'Available data sets' selection
            console.log(data);
            var selection = document.getElementById("inputAvailableDataSets");
            // remove previous options
            selection.options.length = 0;
            // add available file names
            for (var i = 0; i < data.length; i++) {
                selection.options[i] = new Option(data[i], data[i], false, false)
            }
        }
    }

    loadApi.getAvailableDataSets(callback);
}

function loadFile() {

    // abort if no data set is selected
    if (document.getElementById("inputAvailableDataSets").selectedIndex === -1) {
        console.log("No data set selected");
        return;
    }

    // get all input fields
    var filename = document.getElementById("inputAvailableDataSets").options[document.getElementById("inputAvailableDataSets").selectedIndex].value;
    var datasetname = document.getElementById("inputDatasetName").value;
    //var readLabels = document.getElementById("readLabels").options[document.getElementById("readLabels").selectedIndex].value === true;
    var dataType = document.getElementById("dataType").options[document.getElementById("dataType").selectedIndex].value;

    // // call swagger client
    // var api = new ConvolutionalAutoencoder.LoadApi();

    // create callback function
    function loadCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log(response);
            //console.log(data);
            //load the first image batch
            console.log("File loaded");

            appendImages(1000);

            // remove selection:
            document.getElementById("imagePreview").linkedId = "";

        }
    }

    loadApi.loadFile(filename, {
        'datasetname': datasetname,
        'read_labels': false,
        'data_type': dataType
    }, loadCallback);

}

function uploadFile() {
    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log('File uploaded!');
            // update available dat sets:
            getAvailableDataSets();
        }
    }

    var files = document.getElementById("inputUploadFile").files;
    //console.log(filePath);
    for (var i = 0, f; f = files[i]; i++) {
        console.log(f);
        loadApi.uploadFile(f);
    }

}


/*
Attach button events
 */

document.getElementById("loadBtn").addEventListener("click", loadFile);

document.getElementById("showImagesBtn").addEventListener("click", function () {
    appendImages(300);
});

document.getElementById("uploadBtn").addEventListener("click", uploadFile);

/*
Initialisation
 */

// create histogram
var histogram = new Histogram("imagePreviewView", 400, 400);
loadApi.resetAllBatchIndices(callback);
appendImages(1000);
getAvailableDataSets();


