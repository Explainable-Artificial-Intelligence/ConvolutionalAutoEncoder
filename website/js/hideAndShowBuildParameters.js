/*
functions to hide and show parameters
 */
function hideAndShowAdvancedLearningParameters() {
    // get learning rate function
    var selectedOptions = [];
    var selectionFieldOptions = document.getElementById("learningRateFunction").options;
    for (var i = 0; i < selectionFieldOptions.length; i++) {
        if (selectionFieldOptions[i].selected) {
            selectedOptions.push(selectionFieldOptions[i].value)
        }
    }
    console.log(selectedOptions);

    var children = document.getElementById("advancedLearningParameters").children;

    // hide all advanced options
    for (i = 0; i < children.length; i++) {
        children[i].style.display = 'none'
    }

    // activate available options
    for (i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i] === "static") {
            document.getElementById("lrInitialLearningRateDiv").style.display = 'block';
            continue;
        }
        if (selectedOptions[i] === "piecewise_constant") {
            document.getElementById("lrBoundariesDiv").style.display = 'block';
            document.getElementById("lrValuesDiv").style.display = 'block';
            continue;
        }
        if (selectedOptions[i] === "polynomial_decay") {
            document.getElementById("lrInitialLearningRateDiv").style.display = 'block';
            document.getElementById("lrDecayStepsDiv").style.display = 'block';
            document.getElementById("lrEndLearningRateDiv").style.display = 'block';
            document.getElementById("lrPowerDiv").style.display = 'block';
            document.getElementById("lrCycleRateDiv").style.display = 'block';
            continue;
        }
        document.getElementById("lrInitialLearningRateDiv").style.display = 'block';
        document.getElementById("lrDecayStepsDiv").style.display = 'block';
        document.getElementById("lrDecayRateDiv").style.display = 'block';
        document.getElementById("lrStaircaseDiv").style.display = 'block';

    }
}

function hideAndShowMomentum() {
    // get selected optimizer
    var selectedOptions = [];
    var selectionFieldOptions = document.getElementById("Optimizer").options;
    for (var i = 0; i < selectionFieldOptions.length; i++) {
        if (selectionFieldOptions[i].selected) {
            selectedOptions.push(selectionFieldOptions[i].value)
        }
    }
    console.log(selectedOptions);

    if (selectedOptions.indexOf("MomentumOptimizer") !== -1) {
        document.getElementById("MomentumDiv").style.display = 'block';
    } else {
        document.getElementById("MomentumDiv").style.display = 'none';
    }

}

function hideAndShowAdvancedRandomParameters(prefix) {
    // get random weight/biases selection
    var selectedOptions = [];
    var selectionFieldOptions, children;
    if (prefix === "rw") {
        selectionFieldOptions = document.getElementById("randomFunctionForWeights").options;
        children = document.getElementById("advancedWeightParameters").children;
    } else {
        selectionFieldOptions = document.getElementById("randomFunctionForBiases").options;
        children = document.getElementById("advancedBiasParameters").children;
    }
    for (var i = 0; i < selectionFieldOptions.length; i++) {
        if (selectionFieldOptions[i].selected) {
            selectedOptions.push(selectionFieldOptions[i].value)
        }
    }
    console.log(selectedOptions);
    // hide all advanced options
    for (i = 0; i < children.length; i++) {
        children[i].style.display = 'none'
    }

    // activate available options
    for (i = 0; i < selectedOptions.length; i++) {
        if (selectedOptions[i] === "zeros") {
            continue;
        }
        if (selectedOptions[i] === "gamma") {
            document.getElementById(prefix + "AlphaDiv").style.display = 'block';
            document.getElementById(prefix + "BetaDiv").style.display = 'block';
            document.getElementById(prefix + "SeedDiv").style.display = 'block';
            continue;
        }
        if (selectedOptions[i] === "normal") {
            document.getElementById(prefix + "MeanDiv").style.display = 'block';
            document.getElementById(prefix + "StddevDiv").style.display = 'block';
            document.getElementById(prefix + "SeedDiv").style.display = 'block';
            continue;
        }
        if (selectedOptions[i] === "poisson") {
            document.getElementById(prefix + "LamDiv").style.display = 'block';
            document.getElementById(prefix + "SeedDiv").style.display = 'block';
            continue;
        }
        document.getElementById(prefix + "MinvalDiv").style.display = 'block';
        document.getElementById(prefix + "MaxvalDiv").style.display = 'block';
        document.getElementById(prefix + "SeedDiv").style.display = 'block';

    }
}


/*
link Event Listener
 */

document.getElementById("learningRateFunction").addEventListener("change", hideAndShowAdvancedLearningParameters);
document.getElementById("Optimizer").addEventListener("change", hideAndShowMomentum);
document.getElementById("randomFunctionForWeights").addEventListener("change", function () {
    hideAndShowAdvancedRandomParameters("rw");
});
document.getElementById("randomFunctionForBiases").addEventListener("change", function () {
    hideAndShowAdvancedRandomParameters("rb");
});


/*
initial run of all functions
 */

hideAndShowAdvancedLearningParameters();
hideAndShowMomentum();
hideAndShowAdvancedRandomParameters("rw");
hideAndShowAdvancedRandomParameters("rb");
