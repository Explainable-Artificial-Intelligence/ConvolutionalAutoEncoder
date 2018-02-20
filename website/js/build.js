/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
var d3 = require('d3');

var buildApi = new ConvolutionalAutoencoder.BuildApi();

// check API functionality
function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

buildApi.getInputShape([], callback);


function readLearningParameter() {

    var inputParameterList = new ConvolutionalAutoencoder.ParameterList();

    inputParameterList.mirror_weights = [document.getElementById("mirrorWeights").checked];
    inputParameterList.activation_function = [document.getElementById("activationFunction").options[document.getElementById("activationFunction").selectedIndex].value];
    inputParameterList.batch_size = [Number(document.getElementById("batchSize").value)];
    inputParameterList.n_epochs = [Number(document.getElementById("nEpochs").value)];
    inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
    inputParameterList.verbose = document.getElementById("verbose").checked;

    inputParameterList.learning_rate_function = [document.getElementById("learningRateFunction").options[document.getElementById("learningRateFunction").selectedIndex].value];
    inputParameterList.lr_initial_learning_rate = [Number(document.getElementById("lrInitialLearningRate").value)];
    inputParameterList.lr_decay_steps = [Number(document.getElementById("lrDecaySteps").value)];
    inputParameterList.lr_decay_rate = [Number(document.getElementById("lrDecayRate").value)];
    inputParameterList.lr_staircase = [document.getElementById("lrStaircase").checked];
    inputParameterList.lr_boundaries = [JSON.parse(document.getElementById("lrBoundaries").value)];
    inputParameterList.lr_values = [JSON.parse(document.getElementById("lrValues").value)];
    inputParameterList.lr_end_learning_rate = [Number(document.getElementById("lrEndLearningRate").value)];
    inputParameterList.lr_power = [Number(document.getElementById("lrPower").value)];
    inputParameterList.lr_cycle = [document.getElementById("lrCycle").checked];

    inputParameterList.optimizer = [document.getElementById("Optimizer").options[document.getElementById("Optimizer").selectedIndex].value];
    inputParameterList.momentum = [Number(document.getElementById("Momentum").value)];

    inputParameterList.cf_cost_function = [document.getElementById("CostFunctions").options[document.getElementById("CostFunctions").selectedIndex].value];
    inputParameterList.cf_max_val = [Number(document.getElementById("cfMaxVal").value)];
    inputParameterList.cf_filter_size = [Number(document.getElementById("cfFilterSize").value)];
    inputParameterList.cf_filter_sigma = [Number(document.getElementById("cfFilterSigma").value)];
    inputParameterList.cf_k1 = [Number(document.getElementById("cfK1").value)];
    inputParameterList.cf_k2 = [Number(document.getElementById("cfK2").value)];
    inputParameterList.cf_weights = [JSON.parse(document.getElementById("cfWeights").value)];

    inputParameterList.random_function_for_weights = [document.getElementById("randomFunctionForWeights").options[document.getElementById("randomFunctionForWeights").selectedIndex].value];
    inputParameterList.rw_alpha = [Number(document.getElementById("rwAlpha").value)];
    inputParameterList.rw_beta = [Number(document.getElementById("rwBeta").value)];
    inputParameterList.rw_mean = [Number(document.getElementById("rwMean").value)];
    inputParameterList.rw_stddev = [Number(document.getElementById("rwStddev").value)];
    inputParameterList.rw_lam = [Number(document.getElementById("rwLam").value)];
    inputParameterList.rw_minval = [Number(document.getElementById("rwMinval").value)];
    inputParameterList.rw_maxval = [Number(document.getElementById("rwMaxval").value)];
    inputParameterList.rw_seed = [Number(document.getElementById("rwSeed").value)];

    inputParameterList.random_function_for_biases = [document.getElementById("randomFunctionForBiases").options[document.getElementById("randomFunctionForBiases").selectedIndex].value];
    inputParameterList.rb_alpha = [Number(document.getElementById("rbAlpha").value)];
    inputParameterList.rb_beta = [Number(document.getElementById("rbBeta").value)];
    inputParameterList.rb_mean = [Number(document.getElementById("rbMean").value)];
    inputParameterList.rb_stddev = [Number(document.getElementById("rbStddev").value)];
    inputParameterList.rb_lam = [Number(document.getElementById("rbLam").value)];
    inputParameterList.rb_minval = [Number(document.getElementById("rbMinval").value)];
    inputParameterList.rb_maxval = [Number(document.getElementById("rbMaxval").value)];
    inputParameterList.rb_seed = [Number(document.getElementById("rbSeed").value)];

    inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
    inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
    inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];


    return inputParameterList;
}


/*
Convolutional Auto Encoder topology
 */


/*
Helper functions
 */

// get input (output) dimensions
function getInputDimensions() {


    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log('API called successfully.');
            //console.log(response);
            console.log(data);


            //update input shape:
            inputShape = data;

            // add placeholder for first dim:
            inputShape[0] = -1;

            // update topology input output layers:
            updateInputOutputLayer(inputShape[1], inputShape[2], inputShape[3]);

        }
    }

    console.log("test");
    buildApi.getInputShape([], inputShapeCallback)
}

function updateInputOutputLayer(resX, resY, channels) {
    //update view:
    document.getElementById("resXLabel").textContent = resX;
    document.getElementById("resXLabel2").textContent = resX;
    document.getElementById("resYLabel").textContent = resY;
    document.getElementById("resYLabel2").textContent = resY;
    document.getElementById("channelLabel").textContent = channels;
    document.getElementById("channelLabel2").textContent = channels;

}

//
function addLayer(event, filtersize, numStacks) {
    //read parameters:
    filtersize = filtersize || 2;
    numStacks = numStacks || 4;
    /*
    get current ANN topology information
     */

    // get encoder count
    var encoderCount = document.getElementById("encoder").children.length - 1; // one child is input layer

    /*
    append Encoder layer
    */
    console.log("add encoder");

    // generate div
    var encoderDiv = document.createElement("div");
    encoderDiv.id = "encoderLayer_" + (encoderCount + 1);
    encoderDiv.className = "ANNLayer";

    // generate input fields:
    var filtersizeInput = document.createElement("input");
    filtersizeInput.type = "number";
    filtersizeInput.value = filtersize;
    filtersizeInput.style.width = "30px";
    filtersizeInput.id = "filtersizeEL" + (encoderCount + 1);

    var numStacksInput = document.createElement("input");
    numStacksInput.type = "number";
    numStacksInput.value = numStacks;
    numStacksInput.style.width = "30px";
    numStacksInput.id = "numStacksEL" + (encoderCount + 1);

    // generate remove button:
    var removeButton = document.createElement("button");
    removeButton.id = "removeEL" + (encoderCount + 1);
    removeButton.textContent = "-";

    // append elements to div:
    encoderDiv.append("Encoder Layer " + (encoderCount + 1) + ": ");
    encoderDiv.appendChild(document.createElement('br'));
    encoderDiv.appendChild(document.createElement('br'));
    encoderDiv.append("Filtersize: ");
    encoderDiv.appendChild(filtersizeInput);
    encoderDiv.append(" Number of Stacks: ");
    encoderDiv.appendChild(numStacksInput);
    encoderDiv.appendChild(removeButton);

    //add visualisation:
    console.log("test");
    createANNLayer(300, 300, 28, 28, numStacks, "encoderLayer_" + (encoderCount + 1));

    //append to DOM
    document.getElementById("encoder").appendChild(encoderDiv);


    /*
    append decoder layer
    */
    console.log("add decoder");

    // generate div
    var decoderDiv = document.createElement("div");
    decoderDiv.id = "decoderLayer_" + (encoderCount + 1);
    decoderDiv.className = "ANNLayer";

    // generate labels:
    var filtersizeLabel = document.createElement("label");
    filtersizeLabel.textContent = filtersize;
    filtersizeLabel.id = "filtersizeDL" + (encoderCount + 1);

    var numStacksLabel = document.createElement("label");
    numStacksLabel.textContent = numStacks;
    numStacksLabel.id = "numStacksDL" + (encoderCount + 1);

    // append elements to div:
    decoderDiv.append("Decoder Layer " + (encoderCount + 1) + ": ");
    decoderDiv.appendChild(document.createElement('br'));
    decoderDiv.appendChild(document.createElement('br'));
    decoderDiv.append("Filtersize: ");
    decoderDiv.appendChild(filtersizeLabel);
    decoderDiv.append(" Number of Stacks: ");
    decoderDiv.appendChild(numStacksLabel);

    //add visualisation:
    //createANNLayer(300, 300, 28, 28, numStacks, "decoderLayer_" + (encoderCount + 1));

    //append to DOM
    document.getElementById("decoder").insertBefore(decoderDiv, document.getElementById("decoder").firstChild);

    /*
    link input fields
     */
    filtersizeInput.addEventListener("change", function () {
        filtersizeLabel.textContent = filtersizeInput.value;
    });
    numStacksInput.addEventListener("change", function () {
        numStacksLabel.textContent = numStacksInput.value;
    });

    /*
    attach remove button
     */
    removeButton.addEventListener("click", function () {
        document.getElementById("encoder").removeChild(encoderDiv);
        document.getElementById("decoder").removeChild(decoderDiv);
        console.log("layer removed");
    })
}

function createANNLayer(width, height, layerWidth, layerHeight, stackCount, parentNodeID) {
    //create plot pane:
    var plusButtonGroup;
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style('background-color', '#3a3a3a')
        .style('stroke-width', 1);

    //Scales:
    var xScale = d3.scaleLinear();
    xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
    xScale.range([0, width - 20]);
    var yScale = d3.scaleLinear();
    yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);
    yScale.range([0, height - 20]);

    //helper variables:
    var transitionFinished = true;

    //TODO: move styling to css

    // draw rectangles
    //var rects = [];
    for (var i = 1; i <= stackCount; i++) {
        plot.append("rect")
            .attr('class', 'stack_rect')
            .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
            .attr("y", i * 0.2 * yScale(layerHeight))
            .attr("width", xScale(layerWidth))
            .attr("height", yScale(layerHeight))
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', "orange")
            .style('fill-opacity', 0.3);
        //rects.push(rect);
    }

    // add description:
    var xAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
            ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ')
        //.attr("x", (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)))
        //.attr("y", (stackCount * 0.2 + 1) * yScale(layerHeight) + 15)
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var yAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
            (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)')
        //.attr("x", width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 15)
        //.attr("y", (stackCount * 0.2 + 0.5) * yScale(layerHeight))
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var zAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text('stacks: ' + stackCount);

    plusButtonGroup = plot.append("g")
        .attr("class", "stack_button")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
        .on('click', function () {
            if (transitionFinished) {
                console.log("click");
                addStack();
            }
        });
    plusButtonGroup.append("circle")
        .attr('r', 7)
        .attr('cx', 10)
        .attr("class", "stack_button")
        .style('stroke-width', 1)
        .style('stroke', "orange")
        .style('fill', '#3a3a3a');

    plusButtonGroup.append('text')
        .attr('x', 10)
        .attr('y', 4)
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text('+')
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "default");
        });

    var minusButtonGroup = plot.append("g")
        .attr("class", "stack_button")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
        .on('click', function () {
            if (transitionFinished) {
                console.log("click");
                removeStack();
            }
        });
    minusButtonGroup.append("circle")
        .attr('r', 7)
        .attr('cx', -10)
        .attr("class", "stack_button")
        .style('stroke-width', 1)
        .style('stroke', "orange")
        .style('fill', '#3a3a3a');

    minusButtonGroup.append('text')
        .attr('x', -10)
        .attr('y', 4)
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text('-')
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "default");
        });

    // print console output:
    console.log("layerWidth: " + layerWidth);
    console.log("last rect x pos: " + ((width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(layerWidth) / 2)));
    console.log("layerWidth scaled: " + xScale(layerWidth));
    console.log("Width text position: " + (xScale(layerWidth) / 2 + 20));


    function rescaleChart() {
        // rescale Scales:
        xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
        yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);

        // move description
        xAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ');
        yAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
                (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)');
        zAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
                (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
            .text('stacks: ' + stackCount);

        // move +/- buttons:
        minusButtonGroup.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');
        plusButtonGroup.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');


        // move existing stacks:
        plot.selectAll(".stack_rect")
            .transition()
            .duration(500)
            .attr("x", function (d, i) {
                return width - xScale(layerWidth) - (i + 1) * 0.2 * xScale(layerWidth);
            })
            .attr("y", function (d, i) {
                return (i + 1) * 0.2 * yScale(layerHeight);
            })
            .attr("width", function (d, i) {
                return xScale(layerWidth);
            })
            .attr("height", function (d, i) {
                return yScale(layerHeight);
            });
    }

    function addStack() {
        // start animation
        transitionFinished = false;

        // update stack count
        stackCount += 1;
        rescaleChart();


        // add additional stack
        plot.append("rect")
            .transition()
            .duration(500)
            .attr('class', 'stack_rect')
            .attr("x", width - xScale(layerWidth) - (stackCount) * 0.2 * xScale(layerWidth))
            .attr("y", (stackCount) * 0.2 * yScale(layerHeight))
            .attr("width", xScale(layerWidth))
            .attr("height", yScale(layerHeight))
            .style('stroke-width', 1)
            .style('stroke', "lightBlue")
            .style('fill', "lightBlue")
            .style('fill-opacity', 0.3)
            // fade out highlight color:
            .transition()
            .duration(500)
            .style('stroke', "orange")
            .style('fill', "orange")
            .on("end", function () {
                transitionFinished = true;
                console.log("transition finished");
            });

    }

    function removeStack() {
        //abort if only on stack left
        if (stackCount < 2) {
            return;
        }

        // start animation
        transitionFinished = false;

        // update stack count
        stackCount -= 1;
        rescaleChart();


        // remove stack
        plot.selectAll('.stack_rect')
            .filter(function (d, i, list) {
                return i === list.length - 1;
            }).transition()
            .duration(500).remove()
            .on("end", function () {
                transitionFinished = true;
                console.log("transition finished");
            });


    }

    this.addStack = function () {
        addStack();
    };

    this.removeStack = function () {
        removeStack();
    };


}

function buildANN() {
    // get ANN topology:
    var filterSizes = [];
    var numStacks = [];
    var numEncoderLayers = document.getElementById("encoder").childElementCount;
    console.log(numEncoderLayers);
    for (var i = 1; i < numEncoderLayers; i++) {
        // get filtersize of current layer:
        filterSizes.push(Number(document.getElementById("filtersizeEL" + i).value));
        // get number of Stacks of current layer
        numStacks.push(Number(document.getElementById("numStacksEL" + i).value));
    }

    console.log(inputShape);
    console.log(filterSizes);
    console.log(numStacks);
    // get learning parameters (sidebar):
    var inputParameters = readLearningParameter();

    // save topology information
    inputParameters.input_shape = [inputShape];
    inputParameters.filter_sizes = [filterSizes];
    inputParameters.number_of_stacks = [numStacks];

    console.log(inputParameters);


    /*
        initialize API call
     */

    var buildApi = new ConvolutionalAutoencoder.BuildApi();


    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;
        }
    }

    buildApi.buildANN(inputParameters, callback);


}



/*
Global variables
 */

var inputShape = [-1, -1, -1, -1];


/*
Event Listener
 */
document.getElementById("addLayer").addEventListener("click", addLayer);
document.getElementById("buildANN").addEventListener("click", buildANN);


/*
on load
 */

getInputDimensions();

// add sample ANN
addLayer(null, 3, 12);
addLayer(null, 3, 10);
addLayer(null, 2, 10);
addLayer(null, 2, 6);






