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
    root.ConvolutionalAutoencoder.ParameterList = factory(root.ConvolutionalAutoencoder.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The ParameterList model module.
   * @module model/ParameterList
   * @version 1.0.7
   */

  /**
   * Constructs a new <code>ParameterList</code>.
   * @alias module:model/ParameterList
   * @class
   */
  var exports = function() {
    var _this = this;


  };

  /**
   * Constructs a <code>ParameterList</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ParameterList} obj Optional instance to populate.
   * @return {module:model/ParameterList} The populated <code>ParameterList</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('input_shape')) {
        obj['input_shape'] = ApiClient.convertToType(data['input_shape'], [['Number']]);
      }
      if (data.hasOwnProperty('number_of_stacks')) {
        obj['number_of_stacks'] = ApiClient.convertToType(data['number_of_stacks'], [['Number']]);
      }
      if (data.hasOwnProperty('filter_sizes')) {
        obj['filter_sizes'] = ApiClient.convertToType(data['filter_sizes'], [['Number']]);
      }
      if (data.hasOwnProperty('mirror_weights')) {
        obj['mirror_weights'] = ApiClient.convertToType(data['mirror_weights'], ['Boolean']);
      }
      if (data.hasOwnProperty('activation_function')) {
        obj['activation_function'] = ApiClient.convertToType(data['activation_function'], ['String']);
      }
      if (data.hasOwnProperty('batch_size')) {
        obj['batch_size'] = ApiClient.convertToType(data['batch_size'], ['Number']);
      }
      if (data.hasOwnProperty('n_epochs')) {
        obj['n_epochs'] = ApiClient.convertToType(data['n_epochs'], ['Number']);
      }
      if (data.hasOwnProperty('use_tensorboard')) {
        obj['use_tensorboard'] = ApiClient.convertToType(data['use_tensorboard'], 'Boolean');
      }
      if (data.hasOwnProperty('verbose')) {
        obj['verbose'] = ApiClient.convertToType(data['verbose'], 'Boolean');
      }
      if (data.hasOwnProperty('learning_rate_function')) {
        obj['learning_rate_function'] = ApiClient.convertToType(data['learning_rate_function'], ['String']);
      }
      if (data.hasOwnProperty('lr_initial_learning_rate')) {
        obj['lr_initial_learning_rate'] = ApiClient.convertToType(data['lr_initial_learning_rate'], ['Number']);
      }
      if (data.hasOwnProperty('lr_decay_steps')) {
        obj['lr_decay_steps'] = ApiClient.convertToType(data['lr_decay_steps'], ['Number']);
      }
      if (data.hasOwnProperty('lr_decay_rate')) {
        obj['lr_decay_rate'] = ApiClient.convertToType(data['lr_decay_rate'], ['Number']);
      }
      if (data.hasOwnProperty('lr_staircase')) {
        obj['lr_staircase'] = ApiClient.convertToType(data['lr_staircase'], ['Boolean']);
      }
      if (data.hasOwnProperty('lr_boundaries')) {
        obj['lr_boundaries'] = ApiClient.convertToType(data['lr_boundaries'], [['Number']]);
      }
      if (data.hasOwnProperty('lr_values')) {
        obj['lr_values'] = ApiClient.convertToType(data['lr_values'], [['Number']]);
      }
      if (data.hasOwnProperty('lr_end_learning_rate')) {
        obj['lr_end_learning_rate'] = ApiClient.convertToType(data['lr_end_learning_rate'], ['Number']);
      }
      if (data.hasOwnProperty('lr_power')) {
        obj['lr_power'] = ApiClient.convertToType(data['lr_power'], ['Number']);
      }
      if (data.hasOwnProperty('lr_cycle')) {
        obj['lr_cycle'] = ApiClient.convertToType(data['lr_cycle'], ['Boolean']);
      }
        if (data.hasOwnProperty('cf_cost_function')) {
            obj['cf_cost_function'] = ApiClient.convertToType(data['cf_cost_function'], ['String']);
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
      if (data.hasOwnProperty('optimizer')) {
        obj['optimizer'] = ApiClient.convertToType(data['optimizer'], ['String']);
      }
      if (data.hasOwnProperty('momentum')) {
        obj['momentum'] = ApiClient.convertToType(data['momentum'], ['Number']);
      }
      if (data.hasOwnProperty('random_function_for_weights')) {
        obj['random_function_for_weights'] = ApiClient.convertToType(data['random_function_for_weights'], ['String']);
      }
      if (data.hasOwnProperty('rw_alpha')) {
        obj['rw_alpha'] = ApiClient.convertToType(data['rw_alpha'], ['Number']);
      }
      if (data.hasOwnProperty('rw_beta')) {
        obj['rw_beta'] = ApiClient.convertToType(data['rw_beta'], ['Number']);
      }
      if (data.hasOwnProperty('rw_mean')) {
        obj['rw_mean'] = ApiClient.convertToType(data['rw_mean'], ['Number']);
      }
      if (data.hasOwnProperty('rw_stddev')) {
        obj['rw_stddev'] = ApiClient.convertToType(data['rw_stddev'], ['Number']);
      }
      if (data.hasOwnProperty('rw_lam')) {
        obj['rw_lam'] = ApiClient.convertToType(data['rw_lam'], ['Number']);
      }
      if (data.hasOwnProperty('rw_minval')) {
        obj['rw_minval'] = ApiClient.convertToType(data['rw_minval'], ['Number']);
      }
      if (data.hasOwnProperty('rw_maxval')) {
        obj['rw_maxval'] = ApiClient.convertToType(data['rw_maxval'], ['Number']);
      }
      if (data.hasOwnProperty('rw_seed')) {
        obj['rw_seed'] = ApiClient.convertToType(data['rw_seed'], ['Number']);
      }
      if (data.hasOwnProperty('random_function_for_biases')) {
        obj['random_function_for_biases'] = ApiClient.convertToType(data['random_function_for_biases'], ['String']);
      }
      if (data.hasOwnProperty('rb_alpha')) {
        obj['rb_alpha'] = ApiClient.convertToType(data['rb_alpha'], ['Number']);
      }
      if (data.hasOwnProperty('rb_beta')) {
        obj['rb_beta'] = ApiClient.convertToType(data['rb_beta'], ['Number']);
      }
      if (data.hasOwnProperty('rb_mean')) {
        obj['rb_mean'] = ApiClient.convertToType(data['rb_mean'], ['Number']);
      }
      if (data.hasOwnProperty('rb_stddev')) {
        obj['rb_stddev'] = ApiClient.convertToType(data['rb_stddev'], ['Number']);
      }
      if (data.hasOwnProperty('rb_lam')) {
        obj['rb_lam'] = ApiClient.convertToType(data['rb_lam'], ['Number']);
      }
      if (data.hasOwnProperty('rb_minval')) {
        obj['rb_minval'] = ApiClient.convertToType(data['rb_minval'], ['Number']);
      }
      if (data.hasOwnProperty('rb_maxval')) {
        obj['rb_maxval'] = ApiClient.convertToType(data['rb_maxval'], ['Number']);
      }
      if (data.hasOwnProperty('rb_seed')) {
        obj['rb_seed'] = ApiClient.convertToType(data['rb_seed'], ['Number']);
      }
      if (data.hasOwnProperty('session_saver_path')) {
        obj['session_saver_path'] = ApiClient.convertToType(data['session_saver_path'], 'String');
      }
      if (data.hasOwnProperty('load_prev_session')) {
        obj['load_prev_session'] = ApiClient.convertToType(data['load_prev_session'], 'Boolean');
      }
      if (data.hasOwnProperty('session_save_duration')) {
        obj['session_save_duration'] = ApiClient.convertToType(data['session_save_duration'], ['Number']);
      }
      if (data.hasOwnProperty('num_test_pictures')) {
        obj['num_test_pictures'] = ApiClient.convertToType(data['num_test_pictures'], ['Number']);
      }
    }
    return obj;
  }

  /**
   * @member {Array.<Array.<Number>>} input_shape
   */
  exports.prototype['input_shape'] = undefined;
  /**
   * @member {Array.<Array.<Number>>} number_of_stacks
   */
  exports.prototype['number_of_stacks'] = undefined;
  /**
   * @member {Array.<Array.<Number>>} filter_sizes
   */
  exports.prototype['filter_sizes'] = undefined;
  /**
   * @member {Array.<Boolean>} mirror_weights
   */
  exports.prototype['mirror_weights'] = undefined;
  /**
   * @member {Array.<String>} activation_function
   */
  exports.prototype['activation_function'] = undefined;
  /**
   * @member {Array.<Number>} batch_size
   */
  exports.prototype['batch_size'] = undefined;
  /**
   * @member {Array.<Number>} n_epochs
   */
  exports.prototype['n_epochs'] = undefined;
  /**
   * @member {Boolean} use_tensorboard
   */
  exports.prototype['use_tensorboard'] = undefined;
  /**
   * @member {Boolean} verbose
   */
  exports.prototype['verbose'] = undefined;
  /**
   * @member {Array.<String>} learning_rate_function
   */
  exports.prototype['learning_rate_function'] = undefined;
  /**
   * @member {Array.<Number>} lr_initial_learning_rate
   */
  exports.prototype['lr_initial_learning_rate'] = undefined;
  /**
   * @member {Array.<Number>} lr_decay_steps
   */
  exports.prototype['lr_decay_steps'] = undefined;
  /**
   * @member {Array.<Number>} lr_decay_rate
   */
  exports.prototype['lr_decay_rate'] = undefined;
  /**
   * @member {Array.<Boolean>} lr_staircase
   */
  exports.prototype['lr_staircase'] = undefined;
  /**
   * @member {Array.<Array.<Number>>} lr_boundaries
   */
  exports.prototype['lr_boundaries'] = undefined;
  /**
   * @member {Array.<Array.<Number>>} lr_values
   */
  exports.prototype['lr_values'] = undefined;
  /**
   * @member {Array.<Number>} lr_end_learning_rate
   */
  exports.prototype['lr_end_learning_rate'] = undefined;
  /**
   * @member {Array.<Number>} lr_power
   */
  exports.prototype['lr_power'] = undefined;
  /**
   * @member {Array.<Boolean>} lr_cycle
   */
  exports.prototype['lr_cycle'] = undefined;
  /**
   * @member {Array.<String>} cf_cost_function
   */
  exports.prototype['cf_cost_function'] = undefined;
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
    /**
     * @member {Array.<String>} optimizer
     */
    exports.prototype['optimizer'] = undefined;
  /**
   * @member {Array.<Number>} momentum
   */
  exports.prototype['momentum'] = undefined;
  /**
   * @member {Array.<String>} random_function_for_weights
   */
  exports.prototype['random_function_for_weights'] = undefined;
  /**
   * @member {Array.<Number>} rw_alpha
   */
  exports.prototype['rw_alpha'] = undefined;
  /**
   * @member {Array.<Number>} rw_beta
   */
  exports.prototype['rw_beta'] = undefined;
  /**
   * @member {Array.<Number>} rw_mean
   */
  exports.prototype['rw_mean'] = undefined;
  /**
   * @member {Array.<Number>} rw_stddev
   */
  exports.prototype['rw_stddev'] = undefined;
  /**
   * @member {Array.<Number>} rw_lam
   */
  exports.prototype['rw_lam'] = undefined;
  /**
   * @member {Array.<Number>} rw_minval
   */
  exports.prototype['rw_minval'] = undefined;
  /**
   * @member {Array.<Number>} rw_maxval
   */
  exports.prototype['rw_maxval'] = undefined;
  /**
   * @member {Array.<Number>} rw_seed
   */
  exports.prototype['rw_seed'] = undefined;
  /**
   * @member {Array.<String>} random_function_for_biases
   */
  exports.prototype['random_function_for_biases'] = undefined;
  /**
   * @member {Array.<Number>} rb_alpha
   */
  exports.prototype['rb_alpha'] = undefined;
  /**
   * @member {Array.<Number>} rb_beta
   */
  exports.prototype['rb_beta'] = undefined;
  /**
   * @member {Array.<Number>} rb_mean
   */
  exports.prototype['rb_mean'] = undefined;
  /**
   * @member {Array.<Number>} rb_stddev
   */
  exports.prototype['rb_stddev'] = undefined;
  /**
   * @member {Array.<Number>} rb_lam
   */
  exports.prototype['rb_lam'] = undefined;
  /**
   * @member {Array.<Number>} rb_minval
   */
  exports.prototype['rb_minval'] = undefined;
  /**
   * @member {Array.<Number>} rb_maxval
   */
  exports.prototype['rb_maxval'] = undefined;
  /**
   * @member {Array.<Number>} rb_seed
   */
  exports.prototype['rb_seed'] = undefined;
  /**
   * @member {String} session_saver_path
   */
  exports.prototype['session_saver_path'] = undefined;
  /**
   * @member {Boolean} load_prev_session
   */
  exports.prototype['load_prev_session'] = undefined;
  /**
   * @member {Array.<Number>} session_save_duration
   */
  exports.prototype['session_save_duration'] = undefined;
  /**
   * @member {Array.<Number>} num_test_pictures
   */
  exports.prototype['num_test_pictures'] = undefined;



  return exports;
}));


