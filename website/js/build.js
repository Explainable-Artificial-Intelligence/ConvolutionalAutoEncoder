/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var buildApi = new ConvolutionalAutoencoder.BuildApi();
var loadApi = new ConvolutionalAutoencoder.LoadApi();

// check API functionality
function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

// buildApi.getInputShape([], callback);


function readLearningParameter() {

    var inputParameterList = new ConvolutionalAutoencoder.ParameterList();
    inputParameterList.mirror_weights = [document.getElementById("mirrorWeights").checked];
    inputParameterList.activation_function = [document.getElementById("activationFunction").options[document.getElementById("activationFunction").selectedIndex].value];
    inputParameterList.batch_size = [Number(document.getElementById("batchSize").value)];
    inputParameterList.n_epochs = [Number(document.getElementById("nEpochs").value)];
    inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
    inputParameterList.verbose = document.getElementById("verbose").checked;

    var learningRateDict = new ConvolutionalAutoencoder.LearningRate();
    learningRateDict.learning_rate_function = document.getElementById("learningRateFunction").options[document.getElementById("learningRateFunction").selectedIndex].value;
    learningRateDict.lr_initial_learning_rate = [Number(document.getElementById("lrInitialLearningRate").value)];
    learningRateDict.lr_decay_steps = [Number(document.getElementById("lrDecaySteps").value)];
    learningRateDict.lr_decay_rate = [Number(document.getElementById("lrDecayRate").value)];
    learningRateDict.lr_staircase = [document.getElementById("lrStaircase").checked];
    learningRateDict.lr_boundaries = [JSON.parse(document.getElementById("lrBoundaries").value)];
    learningRateDict.lr_values = [JSON.parse(document.getElementById("lrValues").value)];
    learningRateDict.lr_end_learning_rate = [Number(document.getElementById("lrEndLearningRate").value)];
    learningRateDict.lr_power = [Number(document.getElementById("lrPower").value)];
    learningRateDict.lr_cycle = [document.getElementById("lrCycle").checked];
    inputParameterList.learning_rate_dict = [learningRateDict];

    inputParameterList.optimizer = [document.getElementById("Optimizer").options[document.getElementById("Optimizer").selectedIndex].value];
    inputParameterList.momentum = [Number(document.getElementById("Momentum").value)];

    var costFunctionDict = new ConvolutionalAutoencoder.CostFunction();
    costFunctionDict.cf_cost_function = document.getElementById("CostFunctions").options[document.getElementById("CostFunctions").selectedIndex].value;
    costFunctionDict.cf_max_val = [Number(document.getElementById("cfMaxVal").value)];
    costFunctionDict.cf_filter_size = [Number(document.getElementById("cfFilterSize").value)];
    costFunctionDict.cf_filter_sigma = [Number(document.getElementById("cfFilterSigma").value)];
    costFunctionDict.cf_k1 = [Number(document.getElementById("cfK1").value)];
    costFunctionDict.cf_k2 = [Number(document.getElementById("cfK2").value)];
    costFunctionDict.cf_weights = [JSON.parse(document.getElementById("cfWeights").value)];
    inputParameterList.cost_function_dict = [costFunctionDict];

    var randomWeightsDict = new ConvolutionalAutoencoder.RandomFunction();
    randomWeightsDict.random_function = document.getElementById("randomFunctionForWeights").options[document.getElementById("randomFunctionForWeights").selectedIndex].value;
    randomWeightsDict.alpha = [Number(document.getElementById("rwAlpha").value)];
    randomWeightsDict.beta = [Number(document.getElementById("rwBeta").value)];
    randomWeightsDict.mean = [Number(document.getElementById("rwMean").value)];
    randomWeightsDict.stddev = [Number(document.getElementById("rwStddev").value)];
    randomWeightsDict.lam = [Number(document.getElementById("rwLam").value)];
    randomWeightsDict.minval = [Number(document.getElementById("rwMinval").value)];
    randomWeightsDict.maxval = [Number(document.getElementById("rwMaxval").value)];
    randomWeightsDict.seed = [Number(document.getElementById("rwSeed").value)];
    inputParameterList.random_weights_dict = [randomWeightsDict];

    var randomBiasesDict = new ConvolutionalAutoencoder.RandomFunction();
    randomBiasesDict.random_function = document.getElementById("randomFunctionForBiases").options[document.getElementById("randomFunctionForBiases").selectedIndex].value;
    randomBiasesDict.alpha = [Number(document.getElementById("rbAlpha").value)];
    randomBiasesDict.beta = [Number(document.getElementById("rbBeta").value)];
    randomBiasesDict.mean = [Number(document.getElementById("rbMean").value)];
    randomBiasesDict.stddev = [Number(document.getElementById("rbStddev").value)];
    randomBiasesDict.lam = [Number(document.getElementById("rbLam").value)];
    randomBiasesDict.minval = [Number(document.getElementById("rbMinval").value)];
    randomBiasesDict.maxval = [Number(document.getElementById("rbMaxval").value)];
    randomBiasesDict.seed = [Number(document.getElementById("rbSeed").value)];
    inputParameterList.random_biases_dict = [randomBiasesDict];

    inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
    inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
    inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];


    return inputParameterList;
}


/*
Convolutional Auto Encoder topology
 */


/*
Global Variables
 */
var inputShape = [1, 1, 1, 1];
var datasetname = "";

// var previewLayer = new ANNLayerPreview(500, 500, 28, 28, 3, 3, null, true, false, null);

/*
Helper functions
 */

// get input (output) dimensions
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

            // update topology input output layers:
            updateInputOutputLayer(inputShape[1], inputShape[2], inputShape[3]);
        }
    }

    if (datasetname !== "") {
        buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
    }

}

function updateInputOutputLayer(resX, resY, channels) {
    // remove previous input/output layer
    var inputLayer = document.getElementById("input_layer");
    var outputLayer = document.getElementById("output_layer");
    if (inputLayer !== null) {
        inputLayer.parentNode.removeChild(inputLayer);
    }
    if (outputLayer !== null) {
        outputLayer.parentNode.removeChild(outputLayer);
    }

    //add visualisation:
    inputOutputLayerPair = new ANNLayerPair(200, 200, resX, resY, channels, 3, "input_output_layer");

    // update global variable:
    inputLayerDim = [resX, resY];

    // set input output layer as preview:
    annLayerPreview.setLinkedLayer(0);

    // renumber layer
    renumberLayers();

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
                selection.options[i] = new Option(data[i], data[i], false, false)
            }
            // select first element:
            selection.options[0].selected = true;
            selectLoadedDataset();
        }
    }

    loadApi.getLoadedDataSets(callback);
}

function selectLoadedDataset() {
    datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
    getInputDimensions();
}

/*function renumberLayers() {
    var layerDiv = document.getElementById("encoder").childNodes;
    console.log(layerDiv);
    var i = 1;
    for (var child in layerDiv) {
        if (layerDiv[child].tagName === 'DIV') {
            if (layerDiv[child].id.startsWith("encoderLayer_")) {
                layerDiv[child].id = "encoderLayer_" + i;
                // adjust layer text:
                console.log(layerDiv[child].childNodes[0]);
                layerDiv[child].childNodes[0].textContent = "Encoder Layer " + i + ": ";
                i++;
            }
        }

    }
    i--;
    layerDiv = document.getElementById("decoder").childNodes;
    console.log(layerDiv);
    for (var child in layerDiv) {
        if (layerDiv[child].tagName === 'DIV') {
            if (layerDiv[child].id.startsWith("decoderLayer_")) {
                layerDiv[child].id = "decoderLayer_" + i;
                // adjust layer text:
                layerDiv[child].childNodes[0].textContent = "Decoder Layer " + i + ": ";
                i--;
            }
        }

    }
    // layerDiv = document.getElementById("decoder").childNodes;
    // i = 1;
    // for(var child in layerDiv){
    //     layerDiv[child].id = "decoderLayer_" + i;
    //     i++;
    // }

}*/


function buildANN() {
    // get ANN topology:
    var filterSizes = [inputOutputLayerPair.getFilterSize()];
    var numStacks = [inputOutputLayerPair.getStackCount()];

    console.log(inputOutputLayerPair.getFilterSize());

    for (var i = 0; i < encoderDecoderLayerPairs.length; i++) {
        filterSizes.push(encoderDecoderLayerPairs[i].getFilterSize());
        numStacks.push(encoderDecoderLayerPairs[i].getStackCount());
    }
    // var numEncoderLayers = document.getElementById("encoder").childElementCount;
    // console.log(numEncoderLayers);
    // for (var i = 1; i < numEncoderLayers; i++) {
    //     // get filtersize of current layer:
    //     filterSizes.push(Number(document.getElementById("filtersizeEL" + i).value));
    //     // get number of Stacks of current layer
    //     numStacks.push(Number(document.getElementById("numStacksEL" + i).value));
    // }

    // var layerDiv = document.getElementById("encoder").childNodes;
    // console.log(layerDiv);
    // var i = 1;
    // for (var child in layerDiv) {
    //     if (layerDiv[child].tagName === 'DIV') {
    //         // get filtersize of current layer:
    //         console.log(layerDiv[child].getElementsByClassName("filter_description")[0]);
    //         var filterSize = Number(layerDiv[child].getElementsByClassName("filter_description")[0].textContent
    //             .split(':')[1]);
    //         // get number of Stacks of current layer
    //         var stackCount = Number(layerDiv[child].getElementsByClassName("stack_description")[0].textContent
    //             .split(':')[1]);
    //
    //         // add current layer properties to arrays
    //         filterSizes.push(filterSize);
    //         numStacks.push(stackCount);
    //
    //     }
    //
    // }

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
Event Listener
 */
document.getElementById("buildANN").addEventListener("click", buildANN);
document.getElementById("inputLoadedDataSets").addEventListener("change", selectLoadedDataset);


/*
on load
 */

getAvailableDataSets();
// getInputDimensions();


// add sample ANN
addLayer(null, 3, 12);
//addLayer(null, 2, 6);








