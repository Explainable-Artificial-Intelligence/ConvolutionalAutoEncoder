/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.2
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
    instance = new ConvolutionalAutoencoder.LoadApi();
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

  describe('LoadApi', function() {
      describe('getAvailableDataSets', function () {
          it('should call getAvailableDataSets successfully', function (done) {
              //uncomment below and update the code to test getAvailableDataSets
              //instance.getAvailableDataSets(function(error) {
              //  if (error) throw error;
              //expect().to.be();
              //});
              done();
          });
      });
    describe('getImageBatch', function() {
      it('should call getImageBatch successfully', function(done) {
        //uncomment below and update the code to test getImageBatch
        //instance.getImageBatch(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('getImageById', function() {
      it('should call getImageById successfully', function(done) {
        //uncomment below and update the code to test getImageById
        //instance.getImageById(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('getImages', function() {
      it('should call getImages successfully', function(done) {
        //uncomment below and update the code to test getImages
        //instance.getImages(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
      describe('getLatentRepresentationById', function () {
          it('should call getLatentRepresentationById successfully', function (done) {
              //uncomment below and update the code to test getLatentRepresentationById
              //instance.getLatentRepresentationById(function(error) {
              //  if (error) throw error;
              //expect().to.be();
              //});
              done();
          });
      });
    describe('getRandomImages', function() {
      it('should call getRandomImages successfully', function(done) {
        //uncomment below and update the code to test getRandomImages
        //instance.getRandomImages(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('loadFile', function() {
      it('should call loadFile successfully', function(done) {
        //uncomment below and update the code to test loadFile
        //instance.loadFile(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('resetAllBatchIndices', function() {
      it('should call resetAllBatchIndices successfully', function(done) {
        //uncomment below and update the code to test resetAllBatchIndices
        //instance.resetAllBatchIndices(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
    describe('resetBatchIndex', function() {
      it('should call resetBatchIndex successfully', function(done) {
        //uncomment below and update the code to test resetBatchIndex
        //instance.resetBatchIndex(function(error) {
        //  if (error) throw error;
        //expect().to.be();
        //});
        done();
      });
    });
      describe('uploadFile', function () {
          it('should call uploadFile successfully', function (done) {
              //uncomment below and update the code to test uploadFile
              //instance.uploadFile(function(error) {
              //  if (error) throw error;
              //expect().to.be();
              //});
              done();
          });
      });
  });

}));
