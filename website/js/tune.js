/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

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





