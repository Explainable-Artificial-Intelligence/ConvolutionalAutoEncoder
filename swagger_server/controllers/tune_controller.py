import uuid

import connexion
import itertools

import os

from ConvolutionalAutoEncoder import SklearnCAE
from swagger_server.models.parameter_list import ParameterList
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.ModelStorage import ModelStorage
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def control_tuning(trainStatus):
    """
    starts, pauses and stops the tuning
    
    :param trainStatus: new status for training
    :type trainStatus: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        trainStatus = TrainStatus.from_dict(connexion.request.get_json())
    return 'do some magic!'


def pass_ann_parameter_lists(inputParameterLists):
    """
    passes all learning and ANN parameters to the server
    Includes learning parameters and ANN topology as lists
    :param inputParameterLists: object with all tunable parameter lists
    :type inputParameterLists: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        inputParameterLists = ParameterList.from_dict(connexion.request.get_json())

        # generate single parameter set
        parameter_list = {key[1:]: inputParameterLists.__dict__[key] for key in inputParameterLists.__dict__.keys() if
                          key.startswith('_')}

        # set default values to None for input shape and seeds:
        for input_shape in parameter_list['input_shape']:
            # replace first dim (-1) with None (variable size):
            if input_shape[0] == -1:
                input_shape[0] = None
        # set default seed to None if -1 is given
        for seed_init in parameter_list['rw_seed']:
            # replace first dim (-1) with None (variable size):
            if seed_init == -1:
                seed_init = None
        for seed_init in parameter_list['rb_seed']:
            # replace first dim (-1) with None (variable size):
            if seed_init == -1:
                seed_init = None

        # split parameter list in static and variable parameters:
        static_parameter_list = {}
        variable_parameter_list = {}
        for key in parameter_list.keys():
            dict_elem = parameter_list[key]
            if type(dict_elem) is list:
                if len(dict_elem) > 1:
                    variable_parameter_list[key] = dict_elem
                else:
                    static_parameter_list[key] = dict_elem[0]
            else:
                static_parameter_list[key] = dict_elem

        # generate list with all parameter combinations:
        variable_parameter_combinations = list(
            dict(zip(variable_parameter_list, x)) for x in itertools.product(*variable_parameter_list.values()))

        # concat each combination with the static parameter list
        all_parameter_combinations = [dict(parameter_combination, **static_parameter_list) for parameter_combination in
                                      variable_parameter_combinations]

        # generate model for each combination
        for parameter_combination in all_parameter_combinations:
            # generate model object
            unique_id = str(uuid.uuid1())
            ann_model = ModelStorage(parameter_combination, unique_id)

            # generate unique folder for each ann
            if 'session_saver_path' in parameter_combination:
                unique_path = os.path.join(parameter_combination['session_saver_path'], unique_id)
            else:
                unique_path = os.path.join('./save/', unique_id)
            parameter_combination['session_saver_path'] = unique_path
            if not os.path.exists(unique_path):
                os.makedirs(unique_path)

            # generate ann
            cae = SklearnCAE(**parameter_combination)

            ann_model.ann = cae

            Storage.tuning_ANNs.append(ann_model)

        anns = Storage.tuning_ANNs

    return 'CAEs created', 200
