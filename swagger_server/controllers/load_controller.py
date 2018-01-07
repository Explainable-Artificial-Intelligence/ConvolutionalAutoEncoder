import connexion
import sys
import os

import numpy as np

from swagger_server.models import Image
from swagger_server.models.image_data import ImageData
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.ANNHelperFunctions import compute_output_images
from utils.FileParser import load_input_data
from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def get_image_batch(batch_size=100, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns the next batch of input/output images
    images are encoded as png byte strings
    :param batch_size: defines the number of return images
    :type batch_size: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    current_batch_index = Storage.get_current_batch_index(datasetname, output)

    next_batch_index = min(current_batch_index + batch_size, Storage.get_dataset_length(datasetname, output))

    result = get_images(current_batch_index, next_batch_index, datasetname, output)

    # if operation successful, update batch index
    if result[1] == 200:
        Storage.update_batch_index(datasetname, output, next_batch_index)

    return result


def get_image_by_id(id=None, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns a single input/output image
    images are encoded as png byte strings
    :param id: defines the id of the images
    :type id: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """

    if output:
        # check if output images already computed
        compute_output_images(datasetname)
        # get the image as nd array
        image_array = Storage.output_data[datasetname][id]
    else:
        # get the image as nd array
        image_array = Storage.input_data[datasetname][id]

    # create Image
    image = Image()
    image.id = id
    image.bytestring = str(convert_image_array_to_byte_string(image_array, channels=image_array.shape[2]))

    return image, 200


def get_images(start_idx, end_idx, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns a subset of input/output images
    images are encoded as png byte strings
    :param start_idx: name for dataset on the server
    :type start_idx: int
    :param end_idx: name for dataset on the server
    :type end_idx: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    if start_idx < 0 or end_idx < 0:
        return 'Index error: < 0', 415
    if start_idx > end_idx:
        return 'Index Error: start > end', 415

    try:
        if output:
            # check if output images already computed
            compute_output_images(datasetname)
            image_data = Storage.output_data[datasetname]
        else:
            image_data = Storage.input_data[datasetname]

    except KeyError:
        return 'No data found', 404

    if end_idx > Storage.get_dataset_length(datasetname, output):
        return 'Index out of bounds', 415

    input_images = ImageData()
    input_images.num_images = end_idx - start_idx
    input_images.res_x = image_data.shape[1]
    input_images.res_y = image_data.shape[2]
    input_images.images = []
    for i in range(start_idx, end_idx):
        image = Image()
        image.id = i
        # TODO : use byte array
        image.bytestring = convert_image_array_to_byte_string(image_data[i], channels=image_data.shape[3])
        input_images.images.append(image)

    # save train data
    Storage.set_input_data(image_data)

    return input_images, 200


def get_random_images(batch_size=100, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns the next batch of input/output images
    images are encoded as png byte strings
    :param batch_size: defines the number of return images
    :type batch_size: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    return 'do some magic!'


def load_file(filename, datasetname="train_data", read_labels=None, data_type=None):
    """
    Load a train/test data file
    Load a data file in different data formats
    :param filename: 
    :type filename: str
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param read_labels: true to read labels
    :type read_labels: bool
    :param data_type: determines the data format of the input file
    :type data_type: str

    :rtype: None
    """
    print("input file/folder: %s" % filename, file=sys.stderr)

    response, response_code, input_data = load_input_data(filename)
    if response_code == 200:
        # save train data
        Storage.set_input_data(input_data, datasetname)
    return response, response_code
