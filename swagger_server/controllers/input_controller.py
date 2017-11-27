import connexion
from swagger_server.models.input_data import InputData
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
from ..util import deserialize_date, deserialize_datetime


def load_train_data(filename):
    """
    Load a train data file
    Load a train data file in numpy array data format
    :param filename: retruns the train data images for a given file path
    :type filename: str

    :rtype: InputData
    """
    return 'do some magic!'
