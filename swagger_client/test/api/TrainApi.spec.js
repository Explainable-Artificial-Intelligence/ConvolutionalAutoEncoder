/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
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

(function (root, factory) {
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
}(this, function (expect, ConvolutionalAutoencoder) {
    'use strict';

    var instance;

    beforeEach(function () {
        instance = new ConvolutionalAutoencoder.TrainApi();
    });

    var getProperty = function (object, getter, property) {
        // Use getter method if present; otherwise, get the property directly.
        if (typeof object[getter] === 'function')
            return object[getter]();
        else
            return object[property];
    }

    var setProperty = function (object, setter, property, value) {
        // Use setter method if present; otherwise, set the property directly.
        if (typeof object[setter] === 'function')
            object[setter](value);
        else
            object[property] = value;
    }

    describe('TrainApi', function () {
        describe('controlTraining', function () {
            it('should call controlTraining successfully', function (done) {
                //uncomment below and update the code to test controlTraining
                //instance.controlTraining(function(error) {
                //  if (error) throw error;
                //expect().to.be();
                //});
                done();
            });
        });
        describe('getProcessedImageData', function () {
            it('should call getProcessedImageData successfully', function (done) {
                //uncomment below and update the code to test getProcessedImageData
                //instance.getProcessedImageData(function(error) {
                //  if (error) throw error;
                //expect().to.be();
                //});
                done();
            });
        });
        describe('getTrainPerformance', function () {
            it('should call getTrainPerformance successfully', function (done) {
                //uncomment below and update the code to test getTrainPerformance
                //instance.getTrainPerformance(function(error) {
                //  if (error) throw error;
                //expect().to.be();
                //});
                done();
            });
        });
    });

}));
