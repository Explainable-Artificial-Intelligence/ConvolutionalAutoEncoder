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
    instance = new ConvolutionalAutoencoder.ClusterParameters();
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

  describe('ClusterParameters', function() {
    it('should create an instance of ClusterParameters', function() {
      // uncomment below and update the code to test ClusterParameters
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be.a(ConvolutionalAutoencoder.ClusterParameters);
    });

    it('should have the property nClusters (base name: "n_clusters")', function() {
      // uncomment below and update the code to test the property nClusters
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property init (base name: "init")', function() {
      // uncomment below and update the code to test the property init
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property nInit (base name: "n_init")', function() {
      // uncomment below and update the code to test the property nInit
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property maxIter (base name: "max_iter")', function() {
      // uncomment below and update the code to test the property maxIter
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property tol (base name: "tol")', function() {
      // uncomment below and update the code to test the property tol
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property precomputeDistances (base name: "precompute_distances")', function() {
      // uncomment below and update the code to test the property precomputeDistances
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property verbose (base name: "verbose")', function() {
      // uncomment below and update the code to test the property verbose
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property randomState (base name: "random_state")', function() {
      // uncomment below and update the code to test the property randomState
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property copyX (base name: "copy_x")', function() {
      // uncomment below and update the code to test the property copyX
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property nJobs (base name: "n_jobs")', function() {
      // uncomment below and update the code to test the property nJobs
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

    it('should have the property algorithm (base name: "algorithm")', function() {
      // uncomment below and update the code to test the property algorithm
      //var instane = new ConvolutionalAutoencoder.ClusterParameters();
      //expect(instance).to.be();
    });

  });

}));
