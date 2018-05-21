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
    instance = new ConvolutionalAutoencoder.VisualizeApi();
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

  describe('VisualizeApi', function() {
      describe('computeHiddenLayerLatentClustering', function () {
          it('should call computeHiddenLayerLatentClustering successfully', function (done) {
              //uncomment below and update the code to test computeHiddenLayerLatentClustering
              //instance.computeHiddenLayerLatentClustering(function(error) {
              //  if (error) throw error;
              //expect().to.be();
              //});
              done();
          });
      });
    describe('generateImageFromSinglePoint', function() {
      it('should call generateImageFromSinglePoint successfully', function(done) {
        //uncomment below and update the code to test generateImageFromSinglePoint
        //instance.generateImageFromSinglePoint(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('getHiddenLayerLatentClustering', function() {
      it('should call getHiddenLayerLatentClustering successfully', function(done) {
        //uncomment below and update the code to test getHiddenLayerLatentClustering
        //instance.getHiddenLayerLatentClustering(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
      describe('getPretrainedModelAsZip', function () {
          it('should call getPretrainedModelAsZip successfully', function (done) {
              //uncomment below and update the code to test getPretrainedModelAsZip
              //instance.getPretrainedModelAsZip(function(error) {
              //  if (error) throw error;
              //expect().to.be();
              //});
              done();
          });
      });
  });

}));
