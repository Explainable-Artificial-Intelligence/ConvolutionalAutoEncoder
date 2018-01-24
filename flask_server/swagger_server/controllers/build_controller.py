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

        # generate single parameter set
        parameter_set = {}
        for key in inputParameters.__dict__.keys():
            if key.startswith('_'):
                if type(inputParameters.__dict__[key]) is list:
                    parameter_set[key[1:]] = inputParameters.__dict__[key][0]
                else:
                    parameter_set[key[1:]] = inputParameters.__dict__[key]

        # set default values to None for input shape and seeds:
        if parameter_set['input_shape'][0] == -1:
            parameter_set['input_shape'][0] = None
        if parameter_set['rw_seed'] == -1:
            parameter_set['rw_seed'] = None
        if parameter_set['rb_seed'] == -1:
            parameter_set['rb_seed'] = None

        # create convolutional auto encoder:

        cae = SklearnCAE(**parameter_set)

        # save CAE
        Storage.set_cae(cae)

        # reset train indices
        Storage.train_step = 0

        return "CAE created", 202
    return 'parameter parsing error', 415


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
