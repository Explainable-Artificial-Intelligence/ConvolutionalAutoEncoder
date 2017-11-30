import connexion
import sys

import os

import numpy as np
from flask import g

from Storage import Storage
from swagger_server.models.input_data import InputData, Image
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
    print("input file: %s" % filename, file=sys.stderr)
    if os.path.isfile(filename):
        print("yeah!!!", file=sys.stderr)
        try:
            global train_data
            train_data = np.load(filename)
            input_images = InputData()
            input_images.num_images = train_data.shape[0]
            input_images.res_x = train_data.shape[1]
            input_images.res_y = train_data.shape[2]
            input_images.images = []
            for i in range(100):
                image = Image()
                image.id = i
                image.data = train_data[i].tolist()
                input_images.images.append(image)

            # save train data
            Storage.set_train_data(train_data)

            return input_images, 200
        except ValueError:
            return 'file parsing error', 415
    else:
        return 'file not found', 404

