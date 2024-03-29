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
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.ConvolutionalAutoencoder) {
      root.ConvolutionalAutoencoder = {};
    }
    root.ConvolutionalAutoencoder.CostFunction = factory(root.ConvolutionalAutoencoder.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The CostFunction model module.
   * @module model/CostFunction
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>CostFunction</code>.
   * @alias module:model/CostFunction
   * @class
   */
  var exports = function() {
    var _this = this;








  };

  /**
   * Constructs a <code>CostFunction</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CostFunction} obj Optional instance to populate.
   * @return {module:model/CostFunction} The populated <code>CostFunction</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('cf_cost_function')) {
        obj['cf_cost_function'] = ApiClient.convertToType(data['cf_cost_function'], 'String');
      }
      if (data.hasOwnProperty('cf_max_val')) {
        obj['cf_max_val'] = ApiClient.convertToType(data['cf_max_val'], ['Number']);
      }
      if (data.hasOwnProperty('cf_filter_size')) {
        obj['cf_filter_size'] = ApiClient.convertToType(data['cf_filter_size'], ['Number']);
      }
      if (data.hasOwnProperty('cf_filter_sigma')) {
        obj['cf_filter_sigma'] = ApiClient.convertToType(data['cf_filter_sigma'], ['Number']);
      }
      if (data.hasOwnProperty('cf_k1')) {
        obj['cf_k1'] = ApiClient.convertToType(data['cf_k1'], ['Number']);
      }
      if (data.hasOwnProperty('cf_k2')) {
        obj['cf_k2'] = ApiClient.convertToType(data['cf_k2'], ['Number']);
      }
      if (data.hasOwnProperty('cf_weights')) {
        obj['cf_weights'] = ApiClient.convertToType(data['cf_weights'], [['Number']]);
      }
    }
    return obj;
  }

  /**
   * @member {String} cf_cost_function
   * @default 'squared_pixel_distance'
   */
  exports.prototype['cf_cost_function'] = 'squared_pixel_distance';
  /**
   * @member {Array.<Number>} cf_max_val
   */
  exports.prototype['cf_max_val'] = undefined;
  /**
   * @member {Array.<Number>} cf_filter_size
   */
  exports.prototype['cf_filter_size'] = undefined;
  /**
   * @member {Array.<Number>} cf_filter_sigma
   */
  exports.prototype['cf_filter_sigma'] = undefined;
  /**
   * @member {Array.<Number>} cf_k1
   */
  exports.prototype['cf_k1'] = undefined;
  /**
   * @member {Array.<Number>} cf_k2
   */
  exports.prototype['cf_k2'] = undefined;
  /**
   * @member {Array.<Array.<Number>>} cf_weights
   */
  exports.prototype['cf_weights'] = undefined;



  return exports;
}));


