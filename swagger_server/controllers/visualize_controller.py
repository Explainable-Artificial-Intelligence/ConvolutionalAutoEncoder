import connexion

from Storage import Storage
from swagger_server.models.clustering import Clustering
from swagger_server.models.image import Image
from swagger_server.models.input_data import InputData
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
from ..util import deserialize_date, deserialize_datetime


def get_clustering(dimension=None):
    """
    returns the clustering of the latent representation
    
    :param dimension: dimension of the latent representation
    :type dimension: int

    :rtype: Clustering
    """
    return 'do some magic!'


def get_output_image(imageID):
    """
    returns the ANN output for a given input image ID
    
    :param imageID: id (position) of the input image
    :type imageID: int

    :rtype: Image
    """
    image = Image()
    image.data = Storage.get_output_image(imageID)
    return 'do some magic!'


def load_test_data(filename):
    """
    Load a test data file
    Load a test data file in numpy array data format
    :param filename: retruns the test data images for a given file path
    :type filename: str

    :rtype: InputData
    """
    return 'do some magic!'
