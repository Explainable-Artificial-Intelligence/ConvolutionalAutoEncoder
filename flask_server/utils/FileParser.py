"""
Collection of methods to parse input data files
"""
import datetime
import os
import pickle
import shutil
import sys
import uuid
import zipfile

import numpy as np
from PIL import Image
from tensorflow.python.keras import datasets

data_path = os.path.join(os.getcwd(), "data")


def load_input_data(filename, data_type):
    """
    imports input files in several formats
    :param data_type:
    :param filename:
    :return:
    """

    file_path = os.path.join(data_path, filename)
    if os.path.isfile(file_path):
        print("file found", file=sys.stderr)
        if data_type == "auto":
            # start file detection:
            if file_path.lower().endswith('.npy'):
                try:
                    input_data = read_npy_arr_file(file_path)
                    return 'file loaded', 200, input_data
                except ValueError:
                    return 'file parsing error', 415, None
            if file_path.lower().endswith('.zip'):
                try:
                    return read_zip_file(file_path)
                except ValueError:
                    return 'file parsing error', 415, None
        elif data_type == "npy":
            # np array
            try:
                input_data = read_npy_arr_file(file_path)
                return 'file loaded', 200, input_data
            except ValueError:
                return 'file parsing error', 415, None
        elif data_type == "zip":
            # zip file
            try:
                return read_zip_file(file_path)
            except ValueError:
                return 'file parsing error', 415, None
        else:
            return 'unsupported data type', 415, None

    if os.path.isdir(file_path):
        print("folder found", file=sys.stderr)
        try:
            input_data = read_image_folder(file_path)
            return 'file loaded', 200, input_data
        except ValueError:
            return 'folder parsing error', 415, None

    return 'file or folder not found', 404, None


def read_zip_file(file_path):
    """
    reads a zip file containing image files as np array (pixel values)

    :param file_path:
    :return:
    """
    # extract zip file
    extract_directory = extract_zip_file(file_path)
    # load content
    input_data = read_image_folder(os.path.join(data_path, extract_directory))
    # delete temporary extraction folder
    shutil.rmtree(extract_directory, ignore_errors=True)
    return 'file loaded', 200, input_data


def extract_zip_file(file_path):
    """
    extracts a zip file into a random folder and returns the folder name

    :param file_path:
    :return:
    """
    extract_directory = datetime.datetime.now().strftime("%Y%m%d_%H%M%S-") + str(uuid.uuid4())[:8]
    zip_ref = zipfile.ZipFile(file_path, 'r')
    zip_ref.extractall(os.path.join(data_path, extract_directory))
    zip_ref.close()
    return extract_directory


def read_npy_arr_file(file_path):
    """
    return a numpy array from a numpy array save file (np.save())

    :param file_path: file path to the input file
    """
    np_array = np.load(file_path)
    shape = np_array.shape

    # check dimensions:
    if len(shape) != 4:
        print("Error: input data is not 4 dimensional")
        print(shape)

        # workaround for 3D data (b/w images):
        if len(shape) == 3:
            print("3D data will be automatically reshaped")
            np_array = np_array.reshape((shape[0], shape[1], shape[2], 1))

            print(np_array)

    return np_array


def read_image_folder(folder_path):
    """
    returns a numpy array of all images of the folder

    :param folder_path:
    :return:
    """
    # TODO: allow resizing and check for image size
    # TODO: superwised learning by folder
    image_array_list = []
    for (path, dirs, files) in os.walk(folder_path):
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
        for i in range(0, len(array_shape)):
            new_shape[i] = array_shape[i]
        return image_array.reshape(new_shape)

    # return final array
    return image_array


def download_test_data():
    """
    downloads the mnist and cifar test data as numpy array data format

    """

    print("Getting test data...")
    # check if data folder exists
    if not os.path.exists(data_path):
        os.makedirs(data_path)

        # not functional anymore:
        # # download files
        # # TODO: don't download data, but use them online
        # if not os.path.exists(os.path.join(data_path, "cifar_test_data.npy")):
        #     print("    downloading cifar test set ...")
        #     urllib.request.urlretrieve(
        #         "https://www.amazon.de/clouddrive/share/VklV3XIwaprp3SfybM7nq5EoJnrhHuFyJRe3u9qZDs3/Ci16CUCGSda2GNozUPPoqQ?_encoding=UTF8&*Version*=1&*entries*=0&mgh=1",
        #                                os.path.join(data_path, "cifar_test_data.npy"))
        #     # urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/VklV3XIwaprp3SfybM7nq5EoJnrhHuFyJRe3u9qZDs3",
        #     #                            os.path.join(data_path, "cifar_test_data.npy"))
        # if not os.path.exists(os.path.join(data_path, "cifar_train_data.npy")):
        #     print("    downloading cifar train set ...")
        #     urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/zeGKk15hokrQrvBbblXNin7DZOOnSAHFuwJBIMoZVBw",
        #                                os.path.join(data_path, "cifar_train_data.npy"))
        #     # urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/zeGKk15hokrQrvBbblXNin7DZOOnSAHFuwJBIMoZVBw",
        #     #                            os.path.join(data_path, "cifar_train_data.npy"))
        # if not os.path.exists(os.path.join(data_path, "mnist_test_data.npy")):
        #     print("    downloading mnist test set ...")
        #     urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/kLduOnUBYrytpgKDL5Cfg077zVWjQ0Ea0nIH6hBlkOd",
        #                                os.path.join(data_path, "mnist_test_data.npy"))
        #     # urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/kLduOnUBYrytpgKDL5Cfg077zVWjQ0Ea0nIH6hBlkOd",
        #     #                            os.path.join(data_path, "mnist_test_data.npy"))
        # if not os.path.exists(os.path.join(data_path, "mnist_train_data.npy")):
        #     print("    downloading mnist train set ...")
        #     urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/RFIV7M9u00O1CkJ4Ile4vXfr7bqAts0rxKs0ULUVgwf",
        #                                os.path.join(data_path, "mnist_train_data.npy"))
        #     # urllib.request.urlretrieve("https://www.amazon.de/clouddrive/share/RFIV7M9u00O1CkJ4Ile4vXfr7bqAts0rxKs0ULUVgwf",
        #     #
        #                       os.path.join(data_path, "mnist_train_data.npy"))

    # workaround: use tensorflow:
    if not (os.path.exists(os.path.join(data_path, "cifar_test_data.npy") or os.path.exists(
            os.path.join(data_path, "cifar_train_data.npy")))):
        print("    downloading cifar data ...")
        cifar_data = datasets.cifar10.load_data()

        np.save(os.path.join(data_path, "cifar_train_data.npy"), cifar_data[0][0])
        np.save(os.path.join(data_path, "cifar_test_data.npy"), cifar_data[1][0])

    if not (os.path.exists(os.path.join(data_path, "mnist_test_data.npy") or os.path.exists(
            os.path.join(data_path, "mnist_train_data.npy")))):
        print("    downloading mnist data ...")
        mnist_data = datasets.mnist.load_data()

        np.save(os.path.join(data_path, "mnist_train_data.npy"), mnist_data[0][0])
        np.save(os.path.join(data_path, "mnist_test_data.npy"), mnist_data[1][0])
    print("done")


def list_data_files():
    """
        returns a list of all files in the data directory

        :return: list of file names
    """
    if os.path.exists(data_path):
        data_files = [file for file in os.listdir(data_path) if os.path.isfile(os.path.join(data_path, file))]
        return data_files, 200
    else:
        return 'data path not found', 404


def save_data_file(file):
    try:
        filename = file.filename
        file.save(os.path.join(data_path, filename))
        return "File successfully saved", 200
    except IOError:
        return 'File could not be saved to disk', 415


def save_object(python_object, file_path):
    with open(file_path, 'wb') as file:
        pickle.dump(python_object, file, pickle.HIGHEST_PROTOCOL)


def load_object(file_path):
    with open(file_path, 'rb') as file:
        return pickle.load(file)
