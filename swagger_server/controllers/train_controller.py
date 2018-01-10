import threading

import connexion

from swagger_server.models.processed_image_data import ProcessedImageData
from swagger_server.models.train_performance import TrainPerformance
from utils.ANNHelperFunctions import generate_status_image_object_from_status_images
from utils.Storage import Storage


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

    # get status images
    cae = Storage.get_cae()
    status_images = cae.get_current_status_images(setSize)

    # generate ProcessedImageData object from status images
    processed_image_data = generate_status_image_object_from_status_images(status_images)

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
