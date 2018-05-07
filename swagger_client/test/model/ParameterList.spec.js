/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.8
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.3.1
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

      it('should have the property learningRateDict (base name: "learning_rate_dict")', function () {
          // uncomment below and update the code to test the property learningRateDict
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

      it('should have the property costFunctionDict (base name: "cost_function_dict")', function () {
          // uncomment below and update the code to test the property costFunctionDict
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

      it('should have the property randomWeightsDict (base name: "random_weights_dict")', function () {
          // uncomment below and update the code to test the property randomWeightsDict
      //var instane = new ConvolutionalAutoencoder.ParameterList();
      //expect(instance).to.be();
    });

      it('should have the property randomBiasesDict (base name: "random_biases_dict")', function () {
          // uncomment below and update the code to test the property randomBiasesDict
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
