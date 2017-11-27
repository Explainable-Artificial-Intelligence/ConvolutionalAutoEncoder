"""
Collection of methods to parse input data files
"""
import numpy as np


def read_npy_arr_file(filepath):
    """
    return a numpy array from a numpy array save file (np.save())

    :param filepath: file path to the input file
    """
    np_array = np.load(filepath)

    return np_array

