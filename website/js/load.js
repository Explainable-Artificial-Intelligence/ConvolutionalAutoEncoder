var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var api = new ConvolutionalAutoencoder.LoadApi()


var callback = function (error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
};
api.getImageBatch(10, callback);


var loadFile = function () {

    // get all input fields
    var filename = document.getElementById("inputFilePath").value;
    var datasetname = document.getElementById("inputDatasetName").value;
    var readLabels = document.getElementById("readLabels").options[document.getElementById("readLabels").selectedIndex].value === true;
    var dataType = document.getElementById("dataType").options[document.getElementById("dataType").selectedIndex].value;

    // call swagger client
    var api = new ConvolutionalAutoencoder.LoadApi();
    console.log(api.loadFile(filename, datasetname, readLabels, dataType));

};

var appendImages = function () {
    // get image grid
    var imageGrid = document.getElementById("imageGrid");

    // load next Image batch through swagger client
    var api = new ConvolutionalAutoencoder.LoadApi();

    var callback = function (error, data, response) {
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

                // append new image to image grid
                imageGrid.appendChild(newImage);
            }
        }
    };

    api.getImageBatch({batch_size:1000}, callback);

    //console.log(request);


    /*request.onreadystatechange = function () {
        if (request.readyState === 4) {
            var responseHeaders = request.responseHeaders;
            console.log(responseHeaders);
            var responseText = request.responseText;
            console.log(responseText);

        }
    };*/
    /* */


};

/*
Attach button events
 */

document.getElementById("loadBtn").addEventListener("click", loadFile);

document.getElementById("showImagesBtn").addEventListener("click", appendImages);
