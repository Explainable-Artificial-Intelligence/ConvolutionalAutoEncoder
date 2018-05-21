/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.0
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
    instance = new ConvolutionalAutoencoder.Clustering();
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

  describe('Clustering', function() {
    it('should create an instance of Clustering', function() {
      // uncomment below and update the code to test Clustering
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be.a(ConvolutionalAutoencoder.Clustering);
    });

    it('should have the property minX (base name: "minX")', function() {
      // uncomment below and update the code to test the property minX
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

    it('should have the property maxX (base name: "maxX")', function() {
      // uncomment below and update the code to test the property maxX
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

    it('should have the property minY (base name: "minY")', function() {
      // uncomment below and update the code to test the property minY
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

    it('should have the property maxY (base name: "maxY")', function() {
      // uncomment below and update the code to test the property maxY
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

    it('should have the property nClusters (base name: "nClusters")', function() {
      // uncomment below and update the code to test the property nClusters
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

    it('should have the property points (base name: "points")', function() {
      // uncomment below and update the code to test the property points
      //var instane = new ConvolutionalAutoencoder.Clustering();
      //expect(instance).to.be();
    });

  });

}));
