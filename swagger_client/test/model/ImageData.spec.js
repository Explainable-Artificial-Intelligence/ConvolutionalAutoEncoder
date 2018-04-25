/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.3
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
    instance = new ConvolutionalAutoencoder.ImageData();
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

  describe('ImageData', function() {
    it('should create an instance of ImageData', function() {
      // uncomment below and update the code to test ImageData
      //var instane = new ConvolutionalAutoencoder.ImageData();
      //expect(instance).to.be.a(ConvolutionalAutoencoder.ImageData);
    });

    it('should have the property numImages (base name: "numImages")', function() {
      // uncomment below and update the code to test the property numImages
      //var instane = new ConvolutionalAutoencoder.ImageData();
      //expect(instance).to.be();
    });

    it('should have the property resX (base name: "resX")', function() {
      // uncomment below and update the code to test the property resX
      //var instane = new ConvolutionalAutoencoder.ImageData();
      //expect(instance).to.be();
    });

    it('should have the property resY (base name: "resY")', function() {
      // uncomment below and update the code to test the property resY
      //var instane = new ConvolutionalAutoencoder.ImageData();
      //expect(instance).to.be();
    });

    it('should have the property images (base name: "images")', function() {
      // uncomment below and update the code to test the property images
      //var instane = new ConvolutionalAutoencoder.ImageData();
      //expect(instance).to.be();
    });

  });

}));
