/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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
    instance = new ConvolutionalAutoencoder.ProcessedImageData();
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

  describe('ProcessedImageData', function() {
    it('should create an instance of ProcessedImageData', function() {
      // uncomment below and update the code to test ProcessedImageData
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be.a(ConvolutionalAutoencoder.ProcessedImageData);
    });

    it('should have the property epoch (base name: "epoch")', function() {
      // uncomment below and update the code to test the property epoch
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be();
    });

    it('should have the property step (base name: "step")', function() {
      // uncomment below and update the code to test the property step
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be();
    });

    it('should have the property inputLayer (base name: "inputLayer")', function() {
      // uncomment below and update the code to test the property inputLayer
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be();
    });

    it('should have the property latentLayer (base name: "latentLayer")', function() {
      // uncomment below and update the code to test the property latentLayer
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be();
    });

    it('should have the property outputLayer (base name: "outputLayer")', function() {
      // uncomment below and update the code to test the property outputLayer
      //var instane = new ConvolutionalAutoencoder.ProcessedImageData();
      //expect(instance).to.be();
    });

  });

}));
