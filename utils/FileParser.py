"""
Collection of methods to parse input data files
"""
import numpy as np
import os
import urllib.request


def read_npy_arr_file(filepath):
    """
    return a numpy array from a numpy array save file (np.save())

    :param filepath: file path to the input file
    """
    np_array = np.load(filepath)

    return np_array


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
