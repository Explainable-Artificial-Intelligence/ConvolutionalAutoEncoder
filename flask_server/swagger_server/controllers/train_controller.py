import threading

import connexion

from flask_server.swagger_server.models.train_performance import TrainPerformance
from flask_server.swagger_server.models.train_performance_data_point import TrainPerformanceDataPoint
from flask_server.utils.ANNHelperFunctions import generate_status_image_object_from_status_images
from flask_server.utils.ConvolutionalAutoEncoder import SklearnCAE
from flask_server.utils.Storage import Storage


def control_training(trainStatus, datasetName="train_data"):  # noqa: E501
    """starts, pauses and stops the training

    uses a string enum # noqa: E501

    :param trainStatus: new status for training
    :type trainStatus: dict | bytes
    :param datasetName: determines data set for training
    :type datasetName: str

    :rtype: None
    """
    if connexion.request.is_json:
        if not isinstance(Storage.get_cae(), SklearnCAE):
            return "No CAE model available to train", 204
        if trainStatus == "start":
            # get cae and train data
            cae = Storage.get_cae()
            print(type(cae))
            train_data = Storage.get_input_data(datasetName)
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
    if Storage.cae_thread.isAlive():
        train_performance_object.train_status = "running"
    else:
        train_performance_object.train_status = "finished"

    # iterate over steps and generate TrainPerformanceDataPoints:
    train_performance_object.train_performance_data = []
    for i in range(len(current_train_status["train_cost"])):
        train_performance_data_point = TrainPerformanceDataPoint()
        train_performance_data_point.step = current_train_status["step"][i]
        train_performance_data_point.epoch = current_train_status["epoch"][i]
        train_performance_data_point.current_learning_rate = current_train_status["learning_rate"][i]
        train_performance_data_point.cost = current_train_status["train_cost"][i]
        train_performance_object.train_performance_data.append(train_performance_data_point)

    return train_performance_object, 200
