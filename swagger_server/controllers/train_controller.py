import threading
from utils.DimensionReduction import perform_dimension_reduction

from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage

import connexion
from swagger_server.models import Image
from swagger_server.models.processed_image_data import ProcessedImageData
from swagger_server.models.train_performance import TrainPerformance
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
from ..util import deserialize_date, deserialize_datetime


def control_training(trainStatus):
    """
    starts, pauses and stops the training
    uses a string enum
    :param trainStatus: new status for training
    :type trainStatus: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
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

            return "Training aborted", 200


def get_processed_image_data(setSize):
    """
    returns a subset of the current train images and the corresponding latent representation and output
    
    :param setSize: size of the image subset
    :type setSize: int

    :rtype: ProcessedImageData
    """
    # create response object
    processed_image_data = ProcessedImageData([])
    processed_image_data.input_layer = []
    processed_image_data.output_layer = []
    processed_image_data.latent_layer = []

    # get status images
    cae = Storage.get_cae()
    status_images = cae.get_current_status_images(setSize)

    # special case: training is still in first epoch (no pictures available)
    if len(status_images["input_images"].shape) < 4:
        # return an empty response object
        return processed_image_data, 200

    # get num of channels
    channels = status_images["input_images"].shape[3]

    print(status_images["latent_representation"].shape)

    # generate CurrentTrainImages object
    for i in range(len(status_images["indices"])):
        # generate input image
        input_img = Image()
        input_img.bytestring = convert_image_array_to_byte_string(status_images["input_images"][i], channels=channels,
                                                                  normalize=True)
        input_img.id = int(status_images["indices"][i])
        processed_image_data.input_layer.append(input_img)

        output_img = Image()
        output_img.bytestring = convert_image_array_to_byte_string(status_images["output_images"][i], channels=channels,
                                                                   normalize=True)
        output_img.id = int(status_images["indices"][i])
        processed_image_data.output_layer.append(output_img)

        latent_img = Image()
        # TODO: find better way to display latent representation as image
        # perform dim reduction to create image
        shape = status_images["latent_representation"][i].shape
        new_shape = [shape[0], shape[1]*shape[2]]
        latent_img.bytestring = convert_image_array_to_byte_string(
            perform_dimension_reduction(status_images["latent_representation"][i].reshape(new_shape)), channels=1,
            normalize=True)
        latent_img.id = int(status_images["indices"][i])
        processed_image_data.latent_layer.append(latent_img)

    # return image subset
    return processed_image_data, 200


def get_train_performance():
    """
    returns the next batch of scalar train variables
    as list of dicts

    :rtype: TrainPerformance
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
    train_performance_object = TrainPerformance()
    train_performance_object.cost = current_train_status["train_cost"]
    train_performance_object.current_learning_rate = current_train_status["learning_rate"]

    return train_performance_object, 200
