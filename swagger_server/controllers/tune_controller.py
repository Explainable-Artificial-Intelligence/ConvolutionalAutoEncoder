import connexion
from swagger_server.models.parameter_lists import ParameterLists
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
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
        inputParameterLists = ParameterLists.from_dict(connexion.request.get_json())
    return 'do some magic!'
