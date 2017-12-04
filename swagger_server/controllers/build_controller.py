import connexion

from ConcolutionalAutoEncoder import SklearnCAE
from swagger_server.models.parameter_set import ParameterSet
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def pass_ann_parameters(inputParameters):
    """
    passes all learning and ANN parameters to the server
    Includes learning parameters and ANN topology
    :param inputParameters: object with all tunable parameters
    :type inputParameters: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        inputParameters = ParameterSet.from_dict(connexion.request.get_json())
        
        # create convolutional auto encoder:
        input_shape = [None, inputParameters.input_shape[1], inputParameters.input_shape[2],
                       inputParameters.input_shape[3]]
        cae = SklearnCAE(input_shape, inputParameters.number_of_stacks, inputParameters.filter_sizes,
                         inputParameters.mirror_weights, inputParameters.activation_function,
                         inputParameters.batch_size, inputParameters.n_epochs, inputParameters.use_tensorboard,
                         inputParameters.verbose, inputParameters.learning_rate_function,
                         inputParameters.lr_initial_learning_rate, inputParameters.lr_decay_steps,
                         inputParameters.lr_decay_rate, inputParameters.lr_staircase, inputParameters.lr_boundaries,
                         inputParameters.lr_values, inputParameters.lr_end_learning_rate, inputParameters.lr_power,
                         inputParameters.lr_cycle, inputParameters.opimizer, inputParameters.momentum,
                         inputParameters.random_function_for_weights, inputParameters.rw_alpha, inputParameters.rw_beta,
                         inputParameters.rw_mean, inputParameters.rw_stddev, inputParameters.rw_lam,
                         inputParameters.rw_minval, inputParameters.rw_maxval, inputParameters.rw_seed,
                         inputParameters.random_function_for_biases, inputParameters.rb_alpha, inputParameters.rb_beta,
                         inputParameters.rb_mean, inputParameters.rb_stddev, inputParameters.rb_lam,
                         inputParameters.rb_minval, inputParameters.rb_maxval, inputParameters.rb_seed,
                         inputParameters.session_saver_path, inputParameters.load_prev_session)
        # save CAE
        Storage.set_cae(cae)

        return "CAE created", 202
    return 'parameter parsing error', 415
