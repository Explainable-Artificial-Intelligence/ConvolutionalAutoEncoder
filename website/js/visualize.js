/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
//var Slick = require('slick-carousel');

var loadApi = new ConvolutionalAutoencoder.LoadApi();
var buildApi = new ConvolutionalAutoencoder.BuildApi();
var visualizeApi = new ConvolutionalAutoencoder.VisualizeApi();

// increase timeout
visualizeApi.timeout = 1600000;
visualizeApi.defaultTimeout = 160000;

/*
    Global vars
 */
var colorMap = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd'];
var clusterTimer;
var inputShape = [1, 1, 1, 1];
var annInputShape = [1, 1, 1, 1]
var dataSetName = "";


function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

loadApi.resetAllBatchIndices(callback);


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

    buildApi.getInputShape({'datasetName': dataSetName}, inputShapeCallback)
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
                selection.options[i] = new Option(data[i], data[i], false, false);
                checkInputDimensions(selection.options[i]);
            }
            if (selection.options.length > 0) {
                // select first element:
                selection.options[0].selected = true;
                selectLoadedDataset();
            }
        }
    }

    loadApi.getLoadedDataSets(callback);
}

function selectLoadedDataset() {
    var newDatasetname = document.getElementById("inputLoadedDataSets")
        .options[document.getElementById("inputLoadedDataSets").selectedIndex].value;

    // reset batch indices if dataset is changed:
    if (dataSetName !== newDatasetname) {
        loadApi.resetAllBatchIndices();
        dataSetName = newDatasetname;
        $('.slick').slick('removeSlide', null, null, true);
        getInputDimensions();
        appendImages(70);
    }

    // update dataset name
    dataSetName = newDatasetname;
}

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
                newImage.style.width = "48px";
                newImage.src = "data:image/png;base64," + data.images[i].bytestring.substring(2, data.images[i].bytestring.length - 1);
                newImage.classList.add("imageRibbonThumbnail");
                // add eventListener
                // change preview view
                newImage.addEventListener("click", function () {
                        console.log(this.id);
                        document.getElementById("inputPreview").src = this.src;

                        var image_id = this.id.split('_')[1];

                    updatePreviewImages(image_id);

                    //     // get corresponding output image
                    // function outputImageCallback(error, data, response) {
                    //         if (error) {
                    //             console.error(error);
                    //         } else {
                    //             document.getElementById('outputPreview').src = "data:image/png;base64,"
                    //                 + response.body.bytestring.substring(2, response.body.bytestring.length - 1);
                    //
                    //         }
                    //
                    //     }
                    //
                    // loadApi.getImageById(Number(image_id), {'output': true}, outputImageCallback);
                    }
                );


                // append new image to image grid
                newDiv.appendChild(newImage);

                $('.slick').slick('slickAdd', newDiv);
            }
        }
    }

    loadApi.getImageBatch({'datasetname': dataSetName, "batchSize": batchSize}, imageCallback);

}

function ClusterChart(parentNodeID, width, height, colorMap, clustering) {
    console.log(this);

    //storage for datapoints:
    var data = [];
    var points;

    //set initial min/max values:
    var xmin = clustering.minX;
    var xmax = clustering.maxX;
    var ymin = clustering.minY;
    var ymax = clustering.maxY;

    console.log(clustering);


    //create plot pane:
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "clusterChart");

    //create inner panel:
    var panelWidth = width - 100;
    var panelHeight = height - 50;
    var panel = plot.append("g");
    panel.attr("transform", "translate(52.5, 12.5)")
        .attr("width", panelWidth)
        .attr("height", panelHeight);


    //set Scales
    var xScale = d3.scaleLinear();
    xScale.domain([xmin, xmax]);
    xScale.range([0, panelWidth]);
    var yScale = d3.scaleLinear();
    yScale.domain([ymin, ymax]);
    yScale.range([panelHeight, 0]);

    //axis:
    var xAxis = d3.axisBottom(xScale).ticks(5);
    var yAxis = d3.axisLeft(yScale).ticks(5);

    //TODO: move styling in css

    plot.append("g")
        .attr("class", "axis")
        .attr("id", "yAxis")
        .attr("transform", "translate(52.5, 12.5 )")
        .attr("fill", "orange")
        .call(yAxis);

    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(52.5," + (panelHeight + 12.5) + ")")
        .attr("id", "xAxis")
        .call(xAxis);

    // add new points
    points = panel.selectAll('.points')
        .data(clustering.points)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 1.5)
        .attr("cx", function (d) {
            return xScale(d.x);
        })
        .attr("cy", function (d) {
            return yScale(d.y)
        })
        .attr("id", function (d, i) {
            return i
        })
        .style("fill", function (d) {
            return colorMap[d.cluster];
        })
        // add zoom on hover
        .on("mouseover", function (d) {
            d3.select(this)
                .transition()
                .duration(20)
                .attr("r", 5);
        })
        .on("mouseout", function (d) {
            d3.select(this)
                .transition()
                .duration(20)
                .attr("r", 1);
        })
        // add on click function for preview
        .on("click", function () {
            var id = d3.select(this).attr("id");
            console.log(id);
            updatePreviewImages(id);
        });


}

function readClusterParameter() {
    var clusterParameter = new ConvolutionalAutoencoder.ClusterParameters();
    clusterParameter.algorithm = document.getElementById("advancedClusteringAlgorithm").options[document.getElementById("advancedClusteringAlgorithm").selectedIndex].value;
    clusterParameter.copy_x = (document.getElementById("advancedClusteringCopyX").options[document.getElementById("advancedClusteringCopyX").selectedIndex].value === 'true');
    clusterParameter.init = document.getElementById("advancedClusteringInit").options[document.getElementById("advancedClusteringInit").selectedIndex].value;
    clusterParameter.max_iter = Number(document.getElementById("advancedClusteringMaxIter").value);
    clusterParameter.n_clusters = Number(document.getElementById("advancedClusteringNClusters").value);
    clusterParameter.n_init = Number(document.getElementById("advancedClusteringNInit").value);
    clusterParameter.n_jobs = -1;
    clusterParameter.precompute_distances = document.getElementById("advancedClusteringPrecomputeDistances").options[document.getElementById("advancedClusteringPrecomputeDistances").selectedIndex].value;
    clusterParameter.random_state = Number(document.getElementById("advancedClusteringRandomState").value);
    clusterParameter.tol = Number(document.getElementById("advancedClusteringTol").value);
    clusterParameter.verbose = 0;


    return clusterParameter;

}

function generateClusteredImageGrid(NumClusters) {

    console.log("Building cluster grid..");
    // clear previous image grid:
    var imageGrid = document.getElementById("imageGrid");
    imageGrid.innerHTML = "";

    // iterate over all clusters:
    for (var cluster = 0; cluster < NumClusters; cluster++) {
        // generate image grid for current cluster:
        var currentImageGrid = document.createElement("div");
        currentImageGrid.id = "imageGrid_Cluster_" + cluster;
        imageGrid.appendChild(currentImageGrid);

        //generate description:
        var description = document.createElement("label");
        description.textContent = "Cluster " + (cluster + 1) + ":";
        description.style.color = colorMap[cluster];
        currentImageGrid.appendChild(description);
        currentImageGrid.appendChild(document.createElement("br"));

        (function (cluster) {
            function imageCallback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(data);

                    // get image grid:
                    console.log(cluster);
                    var imageGrid = document.getElementById("imageGrid_Cluster_" + cluster);
                    imageGrid.classList.add("horizontal-scroll");
                    imageGrid.classList.add("clusteredImageGrid");
                    //imageGrid.style.width= '800px';
                    // iterate over all images
                    for (var i = 0; i < data.images.length; i++) {
                        // create new image object
                        var newImage = document.createElement("img");
                        newImage.id = "Image_" + data.images[i].id + "_cluster_" + cluster;
                        newImage.style.width = "48px";
                        newImage.style.border = "1px solid " + colorMap[cluster];
                        newImage.src = "data:image/png;base64," + data.images[i].bytestring.substring(2, data.images[i].bytestring.length - 1);
                        newImage.classList.add("imageRibbonThumbnail");
                        // add eventListener
                        newImage.addEventListener("click", function () {
                                console.log(this.id);
                                document.getElementById("inputPreview").src = this.src;
                                var image_id = this.id.split('_')[1];
                                updatePreviewImages(image_id);
                            }
                        );
                        // append new image to image grid
                        imageGrid.appendChild(newImage);
                    }
                }
            }

            loadApi.getRandomImages({
                'datasetname': dataSetName,
                "batchSize": 228,
                "filter": "cluster:" + cluster,
                "sortBy": "color"
            }, imageCallback);
        })(cluster);
    }

}

function getClustering() {
    function clusterCallback(error, data, response) {
        if (error) {
            console.error(error);
            console.log(response);
            // clearInterval(clusterTimer)
            clusterTimer = setInterval(getClustering, 5000);
        } else {
            console.log(response);
            console.log(data);
            clearInterval(clusterTimer);

            // delete previous clustering
            document.getElementById("clusterView").innerHTML = "";

            var clusterChart = new ClusterChart("clusterView", 780, 640, colorMap, response.body);

            generateClusteredImageGrid(response.body.nClusters);

            document.getElementById("drawClustering").disabled = false;
        }
    }

    clearInterval(clusterTimer);
    visualizeApi.getHiddenLayerLatentClustering({'datasetName': dataSetName}, clusterCallback);

}

function startClustering() {


    function clusterCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            clusterTimer = setInterval(getClustering, 5000);
        }
    }

    var clusterParameter = readClusterParameter();
    var algorithm = document.getElementById("clusteringAlgorithm").options[document
        .getElementById("clusteringAlgorithm").selectedIndex].value;
    var dimensionReduction = document.getElementById("dimReductionAlgorithm").options[document
        .getElementById("dimReductionAlgorithm").selectedIndex].value;


    document.getElementById("drawClustering").disabled = true;
    visualizeApi.computeHiddenLayerLatentClustering(algorithm, dimensionReduction, {
        "clusterParameters": clusterParameter,
        'datasetName': dataSetName
    }, clusterCallback);
}

function updatePreviewImages(id) {

    console.log(dataSetName);

    // update input image
    function inputImageCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            document.getElementById('inputPreview').src = "data:image/png;base64,"
                + response.body.bytestring.substring(2, response.body.bytestring.length - 1);

        }

    }

    loadApi.getImageById(Number(id), {'datasetname': dataSetName, 'output': false}, inputImageCallback);

    // update latent image(s)
    function latentImageCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);

            var latentImageGrid = document.getElementById('latentImages');
            latentImageGrid.innerHTML = "";
            //iterate over all images;
            for (var i = 0; i < response.body[0].images.length; i++) {
                //add new image:
                var image = document.createElement("img");
                image.width = 100;
                image.src = "data:image/png;base64," + response.body[0].images[i].bytestring.substring(2,
                    response.body[0].images[i].bytestring.length - 1);
                latentImageGrid.appendChild(image);
            }
        }

    }

    loadApi.getLatentRepresentationById(Number(id), {'datasetname': dataSetName}, latentImageCallback);

    // update output image
    function outputImageCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);

            document.getElementById('outputPreview').src = "data:image/png;base64,"
                + response.body.bytestring.substring(2, response.body.bytestring.length - 1);
            document.getElementById('scoreLabel').textContent = "Score: " + response.body.cost;


        }

    }

    loadApi.getImageById(Number(id), {'datasetname': dataSetName, 'output': true}, outputImageCallback);

}

function downloadModel() {
    function callback(error, data, response) {
        // if (error) {
        //     console.error(error);
        // } else {
        //     //console.log('API called successfully.');
        //     console.log(response);
        //     console.log(data);
        // }

        console.log(response);
        console.log(data);
        console.log(response.text);
    }

    visualizeApi.getPretrainedModelAsZip(callback);

}


//init slick slider
$(document).ready(function () {
    $('.slick').slick({
        lazyLoad: 'ondemand',
        slidesToShow: 30,
        slidesToScroll: 10
    });
});


$('.slick').on('afterChange', function (event, slick, direction) {
    console.log(direction);
    appendImages(20);
    // left
});

/*
init tab
 */
document.getElementById("drawClustering").addEventListener('click', startClustering);
document.getElementById("inputLoadedDataSets").addEventListener("change", selectLoadedDataset);
document.getElementById("btnDownloadModel").addEventListener("click", downloadModel);

getAnnInputDimension();
getAvailableDataSets();







