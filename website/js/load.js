/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
var fs = require('fs');
var path = require('path');

var selectedImageId = "";
var datasetname = "";

var loadApi = new ConvolutionalAutoencoder.LoadApi();
var buildApi = new ConvolutionalAutoencoder.BuildApi();

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
                newImage.style.width = "32px";
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
                        document.getElementById(imagePreview.linkedId).style.width = "32px";
                        document.getElementById(imagePreview.linkedId).style.margin = "";
                    }

                    imagePreview.src = this.src;

                    // update histogram:
                    histogram.setImage(this);


                    // mark selected image:
                    this.style.border = "1px solid orange";
                    this.style.width = "64px";
                    this.style.marginLeft = "32px";
                    this.style.marginRight = "32px";
                    // save current id in preview
                    imagePreview.linkedId = this.id;
                });


                // append new image to image grid
                imageGrid.appendChild(newImage);
            }
        }
    }

    if (datasetname !== "") {
        loadApi.getImageBatch({
            "batchSize": numberOfImages,
            "datasetname": datasetname,
            "sortBy": "color"
        }, imageCallback);
    }


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

            if (selection.options.length > 0) {
                // select first element
                selection.options[0].selected = true;
                document.getElementById("inputDatasetName").value = document.getElementById("inputAvailableDataSets")
                    .options[document.getElementById("inputAvailableDataSets").selectedIndex].value.split('.')[0];
            }

        }
    }

    loadApi.getAvailableDataSets(callback);
}

function getLoadedDataSets() {
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
            }
            if (selection.options.length > 0) {
                // select first element
                selection.options[0].selected = true;
                updateImageGrid();
            }

        }
    }

    loadApi.getLoadedDataSets(callback);
}

function updateDataSetStatistics() {
    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(data);
            //update data statistics:
            document.getElementById("labelResolution").textContent = "Resolution: " + data[1] + "px x " + data[2] + "px";
            document.getElementById("labelLayer").textContent = "Layer: " + data[3];
            document.getElementById("labelNumberOfImages").textContent = "Number of Images: " + data[0];


        }
    }

    if (datasetname !== "") {
        buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
    }

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
            getLoadedDataSets();
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

function updateImageGrid() {
    datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
    var imageGrid = document.getElementById("imageGrid");
    while (imageGrid.firstChild) {
        imageGrid.removeChild(imageGrid.firstChild);
    }
    loadApi.resetAllBatchIndices(callback);
    updateDataSetStatistics();
    appendImages(5000);
}


/*
Attach button events
 */

document.getElementById("loadBtn").addEventListener("click", loadFile);

document.getElementById("showImagesBtn").addEventListener("click", function () {
    appendImages(300);
});

document.getElementById("uploadBtn").addEventListener("click", uploadFile);

document.getElementById("inputAvailableDataSets").addEventListener("change", function () {
    document.getElementById("inputDatasetName").value =
        document.getElementById("inputAvailableDataSets").options[document.getElementById("inputAvailableDataSets")
            .selectedIndex].value.split('.')[0];
});

document.getElementById("inputLoadedDataSets").addEventListener("change", updateImageGrid);

/*
Initialisation
 */

// create histogram
var histogram = new Histogram("histogramView", 400, 400);
loadApi.resetAllBatchIndices(callback);
// remove selection:
document.getElementById("imagePreview").linkedId = "";
getAvailableDataSets();
getLoadedDataSets();


