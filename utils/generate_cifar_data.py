import itertools

import pickle

import numpy as np
import math
import os


def read_cifar_file(filename):
    """

    :param filename:
    :return:
    """
    with open(filename, 'rb') as fo:
        dict = pickle.load(fo, encoding='bytes')
    return dict


def convert_raw_image_data(raw_data, shape, convert_pixel_values_to_float=True):
    """

    :param shape:
    :param convert_pixel_values_to_float:
    :param raw_data:
    :return:
    """
    # convert to np array:
    raw_data = np.array(raw_data, dtype=float)
    # convert pixel values to float
    if convert_pixel_values_to_float:
        raw_data = raw_data / 255.0
    # reshape the data
    images = raw_data.reshape(shape).swapaxes(1, 3).swapaxes(1, 2)

    return images


# load cifar data
# define input file paths:
filename_prefix = "../CIFAR-10/cifar-10-batches-py/data_batch_"
cifar_train_data_list = []
cifar_train_labels = []

# read train data
for i in range(1, 6):
    file_dict = read_cifar_file(filename_prefix + str(i))
    cifar_train_data_list = itertools.chain(cifar_train_data_list, file_dict[b'data'])
    cifar_train_labels = itertools.chain(cifar_train_labels, file_dict[b'labels'])

train_data = convert_raw_image_data(list(cifar_train_data_list), [-1, 3, 32, 32]).tolist()

# read test data
test_data_filename = "../CIFAR-10/cifar-10-batches-py/test_batch"
file_dict = read_cifar_file(test_data_filename)
train_labels = file_dict[b'labels']

test_data = convert_raw_image_data(file_dict[b'data'], [-1, 3, 32, 32]).tolist()

# write test/train data to file

# with open("../data/cifar_train_data.txt", 'w') as train_data_file:
#     for line in train_data:
#         # print(str(line) + "\n")
#         train_data_file.write(str(line) + "\n")
#
# train_data_file.close()
#
# with open("../data/cifar_test_data.txt", 'w') as test_data_file:
#     for line in test_data:
#         # print(str(line) + "\n")
#         test_data_file.write(str(line) + "\n")
#
# test_data_file.close()

np.save("../data/cifar_train_data", train_data)
np.save("../data/cifar_test_data", test_data)
