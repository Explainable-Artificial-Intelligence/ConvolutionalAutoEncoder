/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var api = new ConvolutionalAutoencoder.BuildApi()

var inputParameters = new ConvolutionalAutoencoder.ParameterList(); // {ParameterList} object with all tunable parameters


var callback = function(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
};
api.buildANN(inputParameters, callback);


var readLearningParameter = function () {

    var inputParameterList = new ConvolutionalAutoencoder.ParameterList();

    inputParameterList.mirror_weights = [document.getElementById("mirrorWeights").checked];
    inputParameterList.activation_function = [document.getElementById("activationFunction").options[document.getElementById("activationFunction").selectedIndex].value];
    inputParameterList.batch_size = [document.getElementById("batchSize").value];
    inputParameterList.n_epochs = [document.getElementById("nEpochs").value];
    inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
    inputParameterList.verbose = document.getElementById("verbose").checked;

    inputParameterList.learning_rate_function = [document.getElementById("learningRateFunction").options[document.getElementById("learningRateFunction").selectedIndex].value];
    inputParameterList.lr_initial_learning_rate = [document.getElementById("lrInitialLearningRate").value];
    inputParameterList.lr_decay_steps = [document.getElementById("lrDecaySteps").value];
    inputParameterList.lr_decay_rate = [document.getElementById("lrDecayRate").value];
    inputParameterList.lr_staircase = [document.getElementById("lrStaircase").checked];
    inputParameterList.lr_boundaries = [document.getElementById("lrBoundaries").value];
    inputParameterList.lr_values = [document.getElementById("lrValues").value];
    inputParameterList.lr_end_learning_rate = [document.getElementById("lrEndLearningRate").value];
    inputParameterList.lr_power = [document.getElementById("lrPower").value];
    inputParameterList.lr_cycle = [document.getElementById("lrCycle").checked];

    inputParameterList.optimizer = [document.getElementById("Optimizer").options[document.getElementById("Optimizer").selectedIndex].value];
    inputParameterList.momentum = [document.getElementById("Momentum").value];

    inputParameterList.random_function_for_weights = [document.getElementById("randomFunctionForWeights").options[document.getElementById("randomFunctionForWeights").selectedIndex].value];
    inputParameterList.rw_alpha = [document.getElementById("rwAlpha").value];
    inputParameterList.rw_beta = [document.getElementById("rwBeta").value];
    inputParameterList.rw_mean = [document.getElementById("rwMean").value];
    inputParameterList.rw_stddev = [document.getElementById("rwStddev").value];
    inputParameterList.rw_lam = [document.getElementById("rwLam").value];
    inputParameterList.rw_minval = [document.getElementById("rwMinval").value];
    inputParameterList.rw_maxval = [document.getElementById("rwMaxval").value];
    inputParameterList.rw_seed = [document.getElementById("rwSeed").value];

    inputParameterList.random_function_for_biases = [document.getElementById("randomFunctionForBiases").options[document.getElementById("randomFunctionForBiases").selectedIndex].value];
    inputParameterList.rb_alpha = [document.getElementById("rbAlpha").value];
    inputParameterList.rb_beta = [document.getElementById("rbBeta").value];
    inputParameterList.rb_mean = [document.getElementById("rbMean").value];
    inputParameterList.rb_stddev = [document.getElementById("rbStddev").value];
    inputParameterList.rb_lam = [document.getElementById("rbLam").value];
    inputParameterList.rb_minval = [document.getElementById("rbMinval").value];
    inputParameterList.rb_maxval = [document.getElementById("rbMaxval").value];
    inputParameterList.rb_seed = [document.getElementById("rbSeed").value];

    inputParameterList.session_saver_path = document.getElementById("sessionSaverPath");
    inputParameterList.session_save_duration = document.getElementById("sessionSaveDuration");
    inputParameterList.num_test_pictures = document.getElementById("numTestPictures");


    return inputParameterList;
};