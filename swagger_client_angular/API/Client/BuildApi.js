/**
 * @fileoverview AUTOMATICALLY GENERATED service for API.Client.BuildApi.
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

goog.provide('API.Client.BuildApi');

goog.require('API.Client.ParameterList');

/**
 * @constructor
 * @param {!angular.$http} $http
 * @param {!Object} $httpParamSerializer
 * @param {!angular.$injector} $injector
 * @struct
 */
API.Client.BuildApi = function($http, $httpParamSerializer, $injector) {
  /** @private {!string} */
  this.basePath_ = $injector.has('BuildApiBasePath') ?
                   /** @type {!string} */ ($injector.get('BuildApiBasePath')) :
                   'http://localhost:8080/v2';

  /** @private {!Object<string, string>} */
  this.defaultHeaders_ = $injector.has('BuildApiDefaultHeaders') ?
                   /** @type {!Object<string, string>} */ (
                       $injector.get('BuildApiDefaultHeaders')) :
                   {};

  /** @private {!angular.$http} */
  this.http_ = $http;

  /** @package {!Object} */
  this.httpParamSerializer = $injector.get('$httpParamSerializer');
}
API.Client.BuildApi.$inject = ['$http', '$httpParamSerializer', '$injector'];

/**
 * passes all learning and ANN parameters to the server
 * Includes learning parameters and ANN topology
 * @param {!ParameterList} inputParameters object with all tunable parameters
 * @param {!angular.$http.Config=} opt_extraHttpRequestParams Extra HTTP parameters to send.
 * @return {!angular.$q.Promise}
 */
API.Client.BuildApi.prototype.buildANN = function(inputParameters, opt_extraHttpRequestParams) {
  /** @const {string} */
  var path = this.basePath_ + '/build/buildANN';

  /** @type {!Object} */
  var queryParameters = {};

  /** @type {!Object} */
  var headerParams = angular.extend({}, this.defaultHeaders_);
  // verify required parameter 'inputParameters' is set
  if (!inputParameters) {
    throw new Error('Missing required parameter inputParameters when calling buildANN');
  }
  /** @type {!Object} */
  var httpRequestParams = {
    method: 'POST',
    url: path,
    json: true,
    data: inputParameters,
        params: queryParameters,
    headers: headerParams
  };

  if (opt_extraHttpRequestParams) {
    httpRequestParams = angular.extend(httpRequestParams, opt_extraHttpRequestParams);
  }

  return (/** @type {?} */ (this.http_))(httpRequestParams);
}