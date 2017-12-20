import connexion
import sys
import os

import numpy as np

from swagger_server.models import Image
from swagger_server.models.input_data import InputData
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.FileParser import load_input_data
from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def get_input_images(startIndex, endIndex, datasetname="train_data", sortBy=None):
    """
    returns a subset of input images
    images are encoded as png byte strings
    :param startIndex: name for dataset on the server
    :type startIndex: int
    :param endIndex: name for dataset on the server
    :type endIndex: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sortBy: defines the sorting of the input images
    :type sortBy: str

    :rtype: InputData
    """
    if startIndex < 0 or endIndex < 0:
        return 'Index error: < 0', 415
    if startIndex > endIndex:
        return 'Index Error: start > end', 415

    try:
        train_data = Storage.get_input_data(datasetname)
    except KeyError:
        return 'No data found', 404

    if endIndex > Storage.get_dataset_length(datasetname, "input"):
        return 'Index out of bounds', 415

    input_images = InputData()
    input_images.num_images = endIndex - startIndex
    input_images.res_x = train_data.shape[1]
    input_images.res_y = train_data.shape[2]
    input_images.images = []
    for i in range(startIndex, endIndex):
        image = Image()
        image.id = i
        # TODO : use byte array
        image.bytestring = convert_image_array_to_byte_string(train_data[i], channels=train_data.shape[3])
        input_images.images.append(image)

    # save train data
    Storage.set_input_data(train_data)

    return input_images, 200


def get_next_input_image_batch(datasetname=None, batchSize=100, sortBy=None):
    """
    returns the next batch of input images
    images are encoded as png byte strings
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param batchSize: name for dataset on the server
    :type batchSize: int
    :param sortBy: defines the sorting of the input images
    :type sortBy: str

    :rtype: InputData
    """
    current_batch_index = Storage.get_current_batch_index(datasetname, "input")

    next_batch_index = min(current_batch_index + batchSize, Storage.get_dataset_length(datasetname, "input"))

    result = get_input_images(current_batch_index, next_batch_index, datasetname)

    # if operation successful, update batch index
    if result[1] == 200:
        Storage.update_batch_index(datasetname, "input", next_batch_index)

    return result


def load_train_data(filename, datasetname="train_data"):
    """
    Load a train data file
    Load a train data file in numpy array data format
    :param filename: 
    :type filename: str
    :param datasetname: name for dataset on the server
    :type datasetname: str

    :rtype: None
    """
    print("input file/folder: %s" % filename, file=sys.stderr)

    response, response_code, input_data = load_input_data(filename)
    if response_code == 200:
        # save train data
        Storage.set_input_data(input_data, datasetname)
    return response, response_code
