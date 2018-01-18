/**
 * @fileoverview AUTOMATICALLY GENERATED service for API.Client.TrainApi.
 * Do not edit this file by hand or your changes will be lost next time it is
 * generated.
 *
 * WebUI to build, train and tune a Convolutional Autoencoder
 * Version: 1.0.5
 * Generated by: io.swagger.codegen.languages.JavascriptClosureAngularClientCodegen
 */
/**
 * @license Apache 2.0
 * http://www.apache.org/licenses/LICENSE-2.0.html
 */

goog.provide('API.Client.TrainApi');

goog.require('API.Client.ProcessedImageData');
goog.require('API.Client.TrainPerformance');
goog.require('API.Client.TrainStatus');

/**
 * @constructor
 * @param {!angular.$http} $http
 * @param {!Object} $httpParamSerializer
 * @param {!angular.$injector} $injector
 * @struct
 */
API.Client.TrainApi = function($http, $httpParamSerializer, $injector) {
  /** @private {!string} */
  this.basePath_ = $injector.has('TrainApiBasePath') ?
                   /** @type {!string} */ ($injector.get('TrainApiBasePath')) :
                   'http://localhost:8080/v2';

  /** @private {!Object<string, string>} */
  this.defaultHeaders_ = $injector.has('TrainApiDefaultHeaders') ?
                   /** @type {!Object<string, string>} */ (
                       $injector.get('TrainApiDefaultHeaders')) :
                   {};

  /** @private {!angular.$http} */
  this.http_ = $http;

  /** @package {!Object} */
  this.httpParamSerializer = $injector.get('$httpParamSerializer');
}
API.Client.TrainApi.$inject = ['$http', '$httpParamSerializer', '$injector'];

/**
 * starts, pauses and stops the training
 * uses a string enum
 * @param {!TrainStatus} trainStatus new status for training
 * @param {!angular.$http.Config=} opt_extraHttpRequestParams Extra HTTP parameters to send.
 * @return {!angular.$q.Promise}
 */
API.Client.TrainApi.prototype.controlTraining = function(trainStatus, opt_extraHttpRequestParams) {
  /** @const {string} */
  var path = this.basePath_ + '/train/controlTraining';

  /** @type {!Object} */
  var queryParameters = {};

  /** @type {!Object} */
  var headerParams = angular.extend({}, this.defaultHeaders_);
  // verify required parameter 'trainStatus' is set
  if (!trainStatus) {
    throw new Error('Missing required parameter trainStatus when calling controlTraining');
  }
  /** @type {!Object} */
  var httpRequestParams = {
    method: 'PUT',
    url: path,
    json: true,
    data: trainStatus,
        params: queryParameters,
    headers: headerParams
  };

  if (opt_extraHttpRequestParams) {
    httpRequestParams = angular.extend(httpRequestParams, opt_extraHttpRequestParams);
  }

  return (/** @type {?} */ (this.http_))(httpRequestParams);
}

/**
 * returns a subset of the current train images and the corresponding latent representation and output
 * 
 * @param {!number} setSize size of the image subset
 * @param {!angular.$http.Config=} opt_extraHttpRequestParams Extra HTTP parameters to send.
 * @return {!angular.$q.Promise<!API.Client.ProcessedImageData>}
 */
API.Client.TrainApi.prototype.getProcessedImageData = function(setSize, opt_extraHttpRequestParams) {
  /** @const {string} */
  var path = this.basePath_ + '/train/getProcessedImageData';

  /** @type {!Object} */
  var queryParameters = {};

  /** @type {!Object} */
  var headerParams = angular.extend({}, this.defaultHeaders_);
  // verify required parameter 'setSize' is set
  if (!setSize) {
    throw new Error('Missing required parameter setSize when calling getProcessedImageData');
  }
  if (setSize !== undefined) {
    queryParameters['setSize'] = setSize;
  }

  /** @type {!Object} */
  var httpRequestParams = {
    method: 'GET',
    url: path,
    json: true,
            params: queryParameters,
    headers: headerParams
  };

  if (opt_extraHttpRequestParams) {
    httpRequestParams = angular.extend(httpRequestParams, opt_extraHttpRequestParams);
  }

  return (/** @type {?} */ (this.http_))(httpRequestParams);
}

/**
 * returns the next batch of scalar train variables
 * as list of dicts
 * @param {!angular.$http.Config=} opt_extraHttpRequestParams Extra HTTP parameters to send.
 * @return {!angular.$q.Promise<!API.Client.TrainPerformance>}
 */
API.Client.TrainApi.prototype.getTrainPerformance = function(opt_extraHttpRequestParams) {
  /** @const {string} */
  var path = this.basePath_ + '/train/getTrainPerformance';

  /** @type {!Object} */
  var queryParameters = {};

  /** @type {!Object} */
  var headerParams = angular.extend({}, this.defaultHeaders_);
  /** @type {!Object} */
  var httpRequestParams = {
    method: 'GET',
    url: path,
    json: true,
            params: queryParameters,
    headers: headerParams
  };

  if (opt_extraHttpRequestParams) {
    httpRequestParams = angular.extend(httpRequestParams, opt_extraHttpRequestParams);
  }

  return (/** @type {?} */ (this.http_))(httpRequestParams);
}