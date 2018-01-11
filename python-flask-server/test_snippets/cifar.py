import itertools
import pickle

import ConvolutionalAutoEncoder
import numpy as np


def test_on_cifar_dataset():
    """

    :return:
    """
    # load cifar data
    # define input file paths:
    filename_prefix = "CIFAR-10/cifar-10-batches-py/data_batch_"
    cifar_train_data_list = []
    cifar_train_labels = []

    # read train data
    for i in range(1, 6):
        file_dict = read_cifar_file(filename_prefix + str(i))
        cifar_train_data_list = itertools.chain(cifar_train_data_list, file_dict[b'data'])
        cifar_train_labels = itertools.chain(cifar_train_labels, file_dict[b'labels'])

    train_data = convert_raw_image_data(list(cifar_train_data_list), [-1, 3, 32, 32])

    # read test data
    test_data_filename = "CIFAR-10/cifar-10-batches-py/test_batch"
    file_dict = read_cifar_file(test_data_filename)
    train_labels = file_dict[b'labels']

    test_data = convert_raw_image_data(file_dict[b'data'], [-1, 3, 32, 32])

    # create ANN
    # cae_cifar = ConcolutionalAutoEncoder.SklearnCAE([None, 32, 32, 3], [50, 35, 25, 20], [3, 3, 3, 2, 2])

    # cae_cifar.fit(input_data)

    #print(cae_cifar.score(test_data))
    # final train error: ~ 2200-2500
    # final test error: 262253.0

    #cae_cifar_mirror = ConcolutionalAutoEncoder.SklearnCAE([None, 32, 32, 3], [50, 35, 25, 20], [3, 3, 3, 2, 2],
    #                                                       mirror_weights=True)

    #cae_cifar_mirror.fit(input_data)

    #print(cae_cifar_mirror.score(test_data))
    # final train error: ~ 17000-22000
    # final test error: 1.92739e+06

    #cae_cifar_decay_lr = ConcolutionalAutoEncoder.SklearnCAE([None, 32, 32, 3], [50, 35, 25, 20], [3, 3, 3, 2, 2],
    #                                                       learning_rate_function="exponential_decay")

    #cae_cifar_decay_lr.fit(input_data)

    #print(cae_cifar_decay_lr.score(test_data))
    # final train error: ~1100-1300
    # final test error: 119035.0

    cae_cifar_momentum = ConvolutionalAutoEncoder.SklearnCAE([None, 32, 32, 3], [50, 35, 25, 20], [3, 3, 3, 2, 2],
                                                             optimizer="AdadeltaOptimizer", learning_rate_function="exponential_decay")

    cae_cifar_momentum.fit(train_data)

    print(cae_cifar_momentum.score(test_data))
    # final train error: ~ 5000-6000
    # final test error: 574232.0




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


def main():
    test_on_cifar_dataset()


if __name__ == "__main__":
    main()
