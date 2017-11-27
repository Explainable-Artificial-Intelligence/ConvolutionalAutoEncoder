import connexion
from swagger_server.models.parameter_set import ParameterSet
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
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
    return 'do some magic!'
