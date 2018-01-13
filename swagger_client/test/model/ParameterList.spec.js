/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.5
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define(['expect.js', '../../src/index'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    factory(require('expect.js'), require('../../src/index'));
  } else {
    // Browser globals (root is window)
    factory(root.expect, root.ConvolutionalAutoencoder);
  }
}(this, function(expect, ConvolutionalAutoencoder) {
  'use strict';

  var instance;

  beforeEach(function() {
    instance = new ConvolutionalAutoencoder.ParameterList();
  });

  var getProperty = function(object, getter, property) {
    // Use getter method if present; otherwise, get the property directly.
    if (typeof object[getter] === 'function')
      return object[getter]();
    else
      return object[property];
  }

  var setProperty = function(object, setter, property, value) {
    // Use setter method if present; otherwise, set the property directly.
    if (typeof object[setter] === 'function')
      object[setter](value);
    else
      object[property] = value;
  }

  describe('ParameterList', function() {
    it('should create an instance of ParameterList', function() {
      // uncomment below and update the code to test ParameterList
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be.a(ConvolutionalAutoencoder.ParameterList);
    });

    it('should have the property inputShape (base name: "input_shape")', function() {
      // uncomment below and update the code to test the property inputShape
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property numberOfStacks (base name: "number_of_stacks")', function() {
      // uncomment below and update the code to test the property numberOfStacks
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property filterSizes (base name: "filter_sizes")', function() {
      // uncomment below and update the code to test the property filterSizes
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property mirrorWeights (base name: "mirror_weights")', function() {
      // uncomment below and update the code to test the property mirrorWeights
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property activationFunction (base name: "activation_function")', function() {
      // uncomment below and update the code to test the property activationFunction
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property batchSize (base name: "batch_size")', function() {
      // uncomment below and update the code to test the property batchSize
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property nEpochs (base name: "n_epochs")', function() {
      // uncomment below and update the code to test the property nEpochs
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property useTensorboard (base name: "use_tensorboard")', function() {
      // uncomment below and update the code to test the property useTensorboard
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property verbose (base name: "verbose")', function() {
      // uncomment below and update the code to test the property verbose
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property learningRateFunction (base name: "learning_rate_function")', function() {
      // uncomment below and update the code to test the property learningRateFunction
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrInitialLearningRate (base name: "lr_initial_learning_rate")', function() {
      // uncomment below and update the code to test the property lrInitialLearningRate
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrDecaySteps (base name: "lr_decay_steps")', function() {
      // uncomment below and update the code to test the property lrDecaySteps
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrDecayRate (base name: "lr_decay_rate")', function() {
      // uncomment below and update the code to test the property lrDecayRate
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrStaircase (base name: "lr_staircase")', function() {
      // uncomment below and update the code to test the property lrStaircase
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrBoundaries (base name: "lr_boundaries")', function() {
      // uncomment below and update the code to test the property lrBoundaries
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrValues (base name: "lr_values")', function() {
      // uncomment below and update the code to test the property lrValues
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrEndLearningRate (base name: "lr_end_learning_rate")', function() {
      // uncomment below and update the code to test the property lrEndLearningRate
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrPower (base name: "lr_power")', function() {
      // uncomment below and update the code to test the property lrPower
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property lrCycle (base name: "lr_cycle")', function() {
      // uncomment below and update the code to test the property lrCycle
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property optimizer (base name: "optimizer")', function() {
      // uncomment below and update the code to test the property optimizer
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property momentum (base name: "momentum")', function() {
      // uncomment below and update the code to test the property momentum
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property randomFunctionForWeights (base name: "random_function_for_weights")', function() {
      // uncomment below and update the code to test the property randomFunctionForWeights
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwAlpha (base name: "rw_alpha")', function() {
      // uncomment below and update the code to test the property rwAlpha
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwBeta (base name: "rw_beta")', function() {
      // uncomment below and update the code to test the property rwBeta
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwMean (base name: "rw_mean")', function() {
      // uncomment below and update the code to test the property rwMean
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwStddev (base name: "rw_stddev")', function() {
      // uncomment below and update the code to test the property rwStddev
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwLam (base name: "rw_lam")', function() {
      // uncomment below and update the code to test the property rwLam
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwMinval (base name: "rw_minval")', function() {
      // uncomment below and update the code to test the property rwMinval
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwMaxval (base name: "rw_maxval")', function() {
      // uncomment below and update the code to test the property rwMaxval
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rwSeed (base name: "rw_seed")', function() {
      // uncomment below and update the code to test the property rwSeed
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property randomFunctionForBiases (base name: "random_function_for_biases")', function() {
      // uncomment below and update the code to test the property randomFunctionForBiases
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbAlpha (base name: "rb_alpha")', function() {
      // uncomment below and update the code to test the property rbAlpha
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbBeta (base name: "rb_beta")', function() {
      // uncomment below and update the code to test the property rbBeta
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbMean (base name: "rb_mean")', function() {
      // uncomment below and update the code to test the property rbMean
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbStddev (base name: "rb_stddev")', function() {
      // uncomment below and update the code to test the property rbStddev
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbLam (base name: "rb_lam")', function() {
      // uncomment below and update the code to test the property rbLam
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbMinval (base name: "rb_minval")', function() {
      // uncomment below and update the code to test the property rbMinval
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbMaxval (base name: "rb_maxval")', function() {
      // uncomment below and update the code to test the property rbMaxval
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property rbSeed (base name: "rb_seed")', function() {
      // uncomment below and update the code to test the property rbSeed
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property sessionSaverPath (base name: "session_saver_path")', function() {
      // uncomment below and update the code to test the property sessionSaverPath
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property loadPrevSession (base name: "load_prev_session")', function() {
      // uncomment below and update the code to test the property loadPrevSession
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property sessionSaveDuration (base name: "session_save_duration")', function() {
      // uncomment below and update the code to test the property sessionSaveDuration
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

    it('should have the property numTestPictures (base name: "num_test_pictures")', function() {
      // uncomment below and update the code to test the property numTestPictures
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

  });

}));