import threading

import connexion
import numpy as np

from swagger_server.models import Image
from swagger_server.models.current_train_images import CurrentTrainImages
from swagger_server.models.current_train_status import CurrentTrainStatus
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def control_training(trainStatus):
    """
    starts, pauses and stops the training
    
    :param trainStatus: new status for training
    :type trainStatus: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        trainStatus = TrainStatus.from_dict(connexion.request.get_json())

        if trainStatus == "start":
            # get cae and train data
            cae = Storage.get_cae()
            train_data = Storage.get_input_data()
            # define background thread:
            cae_thread = threading.Thread(target=cae.fit, args=(train_data,))
            Storage.set_cae_thread(cae_thread)
            # start training:
            cae_thread.start()
            return "Training started", 200
        if trainStatus == "stop":
            # get cae
            cae = Storage.get_cae()
            # abort background thread:
            cae.update_ann_status("stop")
            # cae_thread = Storage.get_cae_thread()
            # cae_thread.cancel()

            return "Training aborted", 200


def get_current_ann_images(setSize=10, datasetname="train_data"):
    """
    returns a subset of the current train images and the corresponding latent representation and output
    
    :param setSize: size of the image subset
    :type setSize: int

    :rtype: CurrentTrainImages
    """
    # create response object
    current_train_images = CurrentTrainImages()

    # generate random subset of input images:
    input_subset = Storage.get_input_data(datasetname)[
        np.random.choice(Storage.get_dataset_length(datasetname, "input"), setSize, replace=False)]

    # store the images of the current subset
    current_train_images.input_layer = []
    for image_array in input_subset:
        img = Image()
        img.bytestring = convert_image_array_to_byte_string(image_array, channels=input_subset.shape[3], normalize=True)
        img.id = 100
        current_train_images.input_layer.append(img)

    # generate the output images of the current subset
    cae = Storage.get_cae()
    output_subset = cae.predict(input_subset)

    # store the images of the current output
    current_train_images.output_layer = []
    for image_array in output_subset:
        img = Image()
        img.bytestring = convert_image_array_to_byte_string(image_array, channels=input_subset.shape[3], normalize=True)
        img.id = 100
        current_train_images.output_layer.append(img)

    # return image subset
    return current_train_images, 200


def get_current_train_status():
    """
    returns the next batch of scalar train variables
    as dict of lists

    :rtype: CurrentTrainStatus
    """
    # get Convolutional Auto Encoder
    cae = Storage.get_cae()

    # get previous training step:
    prev_step = Storage.get_prev_training_step()

    # get current training status:
    current_train_status = cae.get_train_status(start_idx=prev_step)

    # update previous training step:
    Storage.update_prev_training_step(len(current_train_status["train_cost"]))

    # build up response object and return it
    current_train_status_object = CurrentTrainStatus()
    current_train_status_object.cost = current_train_status["train_cost"]
    current_train_status_object.current_learning_rate = current_train_status["learning_rate"]
    #current_train_status_object.cost = [1.5]
    #current_train_status_object.current_learning_rate = [1.5, 3.0, 25.5]

    return current_train_status_object, 200


