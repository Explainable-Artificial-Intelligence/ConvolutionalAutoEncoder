import threading

import connexion
import numpy as np

from swagger_server.models import Image
from swagger_server.models.current_train_images import CurrentTrainImages
from swagger_server.models.current_train_status import CurrentTrainStatus
from swagger_server.models.train_status import TrainStatus
from utils.DimensionReduction import perform_dimension_reduction

from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage


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

            return "Training aborted", 200


def get_current_ann_images(setSize=10, datasetname="train_data"):
    """
    returns a subset of the current train images and the corresponding latent representation and output
    
    :param setSize: size of the image subset
    :type setSize: int

    :rtype: CurrentTrainImages
    """
    # create response object
    current_train_images = CurrentTrainImages([])
    current_train_images.input_layer = []
    current_train_images.output_layer = []
    current_train_images.latent_layer = []

    # get status images
    cae = Storage.get_cae()
    status_images = cae.get_current_status_images(setSize)

    # special case: training is still in first epoch (no pictures available)
    if len(status_images["input_images"].shape) < 4:
        # return an empty response object
        return current_train_images, 200

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
        current_train_images.input_layer.append(input_img)

        output_img = Image()
        output_img.bytestring = convert_image_array_to_byte_string(status_images["output_images"][i], channels=channels,
                                                                   normalize=True)
        output_img.id = int(status_images["indices"][i])
        current_train_images.output_layer.append(output_img)

        latent_img = Image()
        # perform dim reduction to create image
        shape = status_images["latent_representation"][i].shape
        new_shape = [shape[0], shape[1]*shape[2]]
        latent_img.bytestring = convert_image_array_to_byte_string(
            perform_dimension_reduction(status_images["latent_representation"][i].reshape(new_shape)), channels=1,
            normalize=True)
        latent_img.id = int(status_images["indices"][i])
        current_train_images.latent_layer.append(latent_img)

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

    return current_train_status_object, 200
