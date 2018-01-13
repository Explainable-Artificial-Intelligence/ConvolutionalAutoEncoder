"""
Collection of methods to parse input data files
"""
import os
import sys
import urllib.request

import numpy as np
from PIL import Image


def load_input_data(filepath):
    """
    imports input files in several formats
    :param filepath:
    :return:
    """

    if os.path.isfile(filepath):
        print("file found", file=sys.stderr)
        if filepath.endswith('.npy') or filepath.endswith('.NPY'):
            try:
                input_data = read_npy_arr_file(filepath)
                return 'file loaded', 200, input_data
            except ValueError:
                return 'file parsing error', 415, None

    if os.path.isdir(filepath):
        print("folder found", file=sys.stderr)
        try:
            input_data = read_image_folder(filepath)
            return 'file loaded', 200, input_data
        except ValueError:
            return 'folder parsing error', 415, None

    return 'file or folder not found', 404, None


def read_npy_arr_file(filepath):
    """
    return a numpy array from a numpy array save file (np.save())

    :param filepath: file path to the input file
    """
    np_array = np.load(filepath)

    return np_array


def read_image_folder(folderpath):
    """
    returns a numpy array of all images of the folder

    :param folderpath:
    :return:
    """
    # TODO: allow resizing and check for image size
    # TODO: superwised learning by folder
    image_array_list = []
    for (path, dirs, files) in os.walk(folderpath):
        for file in files:
            filename = os.path.join(path, file)
            if filename.endswith('.png') or filename.endswith('.PNG'):
                image = Image.open(filename)
                # convert to numpy array and save the array to the list
                image_array_list.append(np.array(image))

    # create a np array for all images
    image_array = np.array(image_array_list)

    # reshape b/w image_array to 4D array
    array_shape = image_array.shape
    if len(array_shape) < 4:
        new_shape = [1] * 4
        for i in range(0,len(array_shape)):
            new_shape[i] = array_shape[i]
        return image_array.reshape(new_shape)

    # return final array
    return image_array


def download_test_data():
    """
    downloads the mnist and cifar test data as numpy array data format

    """

    # check if data folder exists
    data_path = os.path.join(os.getcwd(), "data")
    if not os.path.exists(data_path):
        os.makedirs(data_path)

    # download files
    # TODO: don't download data, but use them online
    if not os.path.exists(os.path.join(data_path, "cifar_test_data.npy")):
        urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/VklV3XIwaprp3SfybM7nq5EoJnrhHuFyJRe3u9qZDs3",
                                   os.path.join(data_path, "cifar_test_data.npy"))
    if not os.path.exists(os.path.join(data_path, "cifar_train_data.npy")):
        urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/zeGKk15hokrQrvBbblXNin7DZOOnSAHFuwJBIMoZVBw",
                                   os.path.join(data_path, "cifar_train_data.npy"))
    if not os.path.exists(os.path.join(data_path, "mnist_test_data.npy")):
        urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/kLduOnUBYrytpgKDL5Cfg077zVWjQ0Ea0nIH6hBlkOd",
                                   os.path.join(data_path, "mnist_test_data.npy"))
    if not os.path.exists(os.path.join(data_path, "mnist_train_data.npy")):
        urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/RFIV7M9u00O1CkJ4Ile4vXfr7bqAts0rxKs0ULUVgwf",
                                   os.path.join(data_path, "mnist_train_data.npy"))