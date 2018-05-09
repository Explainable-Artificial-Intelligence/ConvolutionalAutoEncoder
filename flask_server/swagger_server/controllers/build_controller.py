import connexion

from flask_server.ConvolutionalAutoEncoder import SklearnCAE
from flask_server.swagger_server.models.parameter_list import ParameterList
from flask_server.utils.Storage import Storage


def build_ann(inputParameters):
    """
    passes all learning and ANN parameters to the server
    Includes learning parameters and ANN topology
    :param inputParameters: object with all tunable parameters
    :type inputParameters: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        inputParameters = ParameterList.from_dict(connexion.request.get_json())

        # store parameter set:
        Storage.parameter_set = inputParameters

        # generate single parameter set
        parameter_set = {}
        for key in inputParameters.__dict__.keys():
            if key.startswith('_'):
                if type(inputParameters.__dict__[key]) is list:
                    parameter_set[key[1:]] = inputParameters.__dict__[key][0]
                else:
                    parameter_set[key[1:]] = inputParameters.__dict__[key]

        # print(parameter_set)

        # # set default values to None for input shape, seeds and weights:
        # if parameter_set['input_shape'][0] == -1:
        #     parameter_set['input_shape'][0] = None
        # if parameter_set['random_biases_dict']['seed'] == -1:
        #     parameter_set['random_biases_dict']['seed'] = None
        # if parameter_set['random_weights_dict']['seed'] == -1:
        #     parameter_set['random_weights_dict']['seed'] = None
        # if parameter_set['cost_function_dict']['cf_weights'] == [0.0]:
        #     parameter_set['cost_function_dict']['cf_weights'] = None

        # unpack dicts:
        # learning rate
        for key in inputParameters.learning_rate_dict[0].__dict__.keys():
            if key.startswith('_'):
                if type(inputParameters.learning_rate_dict[0].__dict__[key]) is list:
                    parameter_set[key[1:]] = inputParameters.learning_rate_dict[0].__dict__[key][0]
                else:
                    parameter_set[key[1:]] = inputParameters.learning_rate_dict[0].__dict__[key]

        # cost function
        for key in inputParameters.cost_function_dict[0].__dict__.keys():
            if key.startswith('_'):
                if type(inputParameters.cost_function_dict[0].__dict__[key]) is list:
                    parameter_set[key[1:]] = inputParameters.cost_function_dict[0].__dict__[key][0]
                else:
                    parameter_set[key[1:]] = inputParameters.cost_function_dict[0].__dict__[key]

        # random functions for biases and weights
        for key in inputParameters.random_biases_dict[0].__dict__.keys():
            if key.startswith('_'):
                if key[1:] == 'random_function':
                    parameter_set['random_function_for_biases'] = inputParameters.random_biases_dict[0].__dict__[key]
                else:
                    if type(inputParameters.random_biases_dict[0].__dict__[key]) is list:
                        parameter_set['rb_' + key[1:]] = inputParameters.random_biases_dict[0].__dict__[key][0]
                    else:
                        parameter_set['rb_' + key[1:]] = inputParameters.random_biases_dict[0].__dict__[key]

        for key in inputParameters.random_weights_dict[0].__dict__.keys():
            if key.startswith('_'):
                if key[1:] == 'random_function':
                    parameter_set['random_function_for_weights'] = inputParameters.random_weights_dict[0].__dict__[key]
                else:
                    if type(inputParameters.random_weights_dict[0].__dict__[key]) is list:
                        parameter_set['rw_' + key[1:]] = inputParameters.random_weights_dict[0].__dict__[key][0]
                    else:
                        parameter_set['rw_' + key[1:]] = inputParameters.random_weights_dict[0].__dict__[key]

        # remove dicts from parameter set:
        parameter_set.pop('learning_rate_dict', None)
        parameter_set.pop('cost_function_dict', None)
        parameter_set.pop('random_biases_dict', None)
        parameter_set.pop('random_weights_dict', None)

        # set default values to None for input shape and seeds:
        if parameter_set['input_shape'][0] == -1:
            parameter_set['input_shape'][0] = None
        if parameter_set['rw_seed'] == -1:
            parameter_set['rw_seed'] = None
        if parameter_set['rb_seed'] == -1:
            parameter_set['rb_seed'] = None
        if parameter_set['cf_weights'] == [0.0]:
            parameter_set['cf_weights'] = None

        # create convolutional auto encoder:
        cae = SklearnCAE(**parameter_set)

        # save CAE
        Storage.set_cae(cae)

        # reset train indices
        Storage.train_step = 0

        return "CAE created", 202
    return 'parameter parsing error', 415


def get_ann_parameter():  # noqa: E501
    """returns the parameter set of the created ANN

    returns a object of type ParameterList # noqa: E501


    :rtype: ParameterList
    """

    test = Storage.parameter_set
    return Storage.parameter_set, 200


def get_input_shape(dataset_name="train_data"):
    """
    returns the input shape of the train data
    returns the input shape of the train data
    :param dataset_name: name of the dataset
    :type dataset_name: str

    :rtype: List[int]
    """
    input_shape = Storage.input_data[dataset_name].shape
    print(input_shape)
    return input_shape, 200
