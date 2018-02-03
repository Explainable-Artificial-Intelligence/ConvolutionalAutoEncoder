/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
//var Slick = require('slick-carousel');

var loadApi = new ConvolutionalAutoencoder.LoadApi();


function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

loadApi.resetAllBatchIndices(callback);


function appendImages(batchSize) {
    // get image grid
    var imageGrid = document.getElementById("imageRibbon");

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
                //put every image in a new div:
                var newDiv = document.createElement("div");
                // create new image object
                var newImage = document.createElement("img");
                newImage.id = "Image_" + data.images[i].id;
                newImage.src = "data:image/png;base64," + data.images[i].bytestring.substring(2, data.images[i].bytestring.length - 1);
                newImage.classList.add("imageRibbonThumbnail");
                // add eventListener
                // change preview view
                newImage.addEventListener("click", function () {
                        console.log(this.id);
                        document.getElementById("inputPreview").src = this.src;

                        var image_id = this.id.split('_')[1];

                        // get corresponding output image
                        function outpuImageCallback(error, data, response) {
                            if (error) {
                                console.error(error);
                            } else {
                                console.log(response);
                                console.log(response.body.bytestring);
                                document.getElementById('outputPreview').src = "data:image/png;base64,"
                                    + response.body.bytestring.substring(2, response.body.bytestring.length - 1);


                                console.log("InputImage");
                                console.log(String(document.getElementById("inputPreview").src).split(',')[1]);

                                console.log("outputImage");
                                console.log(response.body.bytestring.substring(2, response.body.bytestring.length - 1));
                            }

                        }

                        loadApi.getImageById(Number(image_id), {'output': true}, outpuImageCallback);
                    }
                );


                // append new image to image grid
                newDiv.appendChild(newImage);

                $('.slick').slick('slickAdd', newDiv);
            }
        }
    }

    loadApi.getImageBatch({"batchSize": batchSize}, imageCallback);

}


appendImages(30);


//init slick slider
$(document).ready(function () {
    $('.slick').slick({
        lazyLoad: 'ondemand',
        slidesToShow: 25,
        slidesToScroll: 10,
    });
});


$('.slick').on('afterChange', function (event, slick, direction) {
    console.log(direction);
    appendImages(11);
    // left
});



