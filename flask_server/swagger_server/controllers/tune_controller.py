import datetime
import datetime
import os
import threading
import uuid

import connexion

from flask_server.ConvolutionalAutoEncoder import SklearnCAE
from flask_server.swagger_server.models.parameter_list import ParameterList
from flask_server.swagger_server.models.train_performance import TrainPerformance
from flask_server.swagger_server.models.train_performance_data_point import TrainPerformanceDataPoint
from flask_server.swagger_server.models.train_status import TrainStatus
from flask_server.utils.ANNHelperFunctions import generate_status_image_object_from_status_images, \
    generate_parameter_combination_list
from flask_server.utils.ModelStorage import ModelStorage
from flask_server.utils.Storage import Storage
from flask_server.utils.TuningQueue import TuningQueue


def control_tuning(trainStatus):
    """
    starts, pauses and stops the tuning
    
    :param trainStatus: new status for training
    :type trainStatus: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        trainStatus = TrainStatus.from_dict(connexion.request.get_json())

        if trainStatus == "start":
            # get tuning queue and train data
            tuning_queue = TuningQueue()
            train_data = Storage.get_input_data()
            # define background thread:
            tuning_thread = threading.Thread(target=tuning_queue.run_tuning, args=(train_data,))
            # store object in global storage class
            Storage.tuning_queue = tuning_queue
            Storage.tuning_thread = tuning_thread
            # start training:
            tuning_thread.start()
            return "Training started", 200
        if trainStatus == "stop":
            # get get tuning queue and abort background thread:
            Storage.tuning_queue.stop_tuning()
            return "Training aborted", 200
    return 'do some magic!'


def get_processed_image_data_of_current_tuning(setSize):
    """
    returns a subset of the current train images and the corresponding latent representation and output
    
    :param setSize: size of the image subset
    :type setSize: int

    :rtype: ProcessedImageData
    """
    # get status images
    status_images = Storage.tuning_queue.get_processed_image_data(setSize)

    # generate ProcessedImageData object from status images
    processed_image_data = generate_status_image_object_from_status_images(status_images)

    # return image subset
    return processed_image_data, 200


def get_processed_image_data_of_specific_tuning(setSize, modelId):
    """
    returns a subset of the current train images and the corresponding latent representation and output

    :param setSize: size of the image subset
    :type setSize: int
    :param modelId: model id of the exspected parameter set
    :type modelId: str

    :rtype: ProcessedImageData
    """
    # get model by id
    model_storage = Storage.get_tune_model(modelId)

    # catch key not found error
    if model_storage is None:
        return "Model ID not found", 415

    # slice train images:
    sliced_train_images = {"input_images": model_storage.train_images[:setSize],
                           "latent_representation": model_storage.train_images[:setSize],
                           "output_images": model_storage.train_images[:setSize],
                           "indices": model_storage.train_images[:setSize]}

    # generate ProcessedImageData object from status images
    processed_image_data = generate_status_image_object_from_status_images(sliced_train_images)

    return processed_image_data, 200


def get_train_performance_of_current_tuning():
    """
    returns the next batch of scalar train variables
    as list of dicts

    :rtype: TrainPerformance
    """

    # get current training status:
    current_train_performance = Storage.tuning_queue.get_training_performance()

    # build up response object and return it
    # iterate over steps and generate TrainPerformanceDataPoints:
    train_performance_object = TrainPerformance()
    train_performance_object.model_id = Storage.tuning_queue.current_running_model.id
    train_performance_object.train_status = Storage.tuning_status
    train_performance_object.train_performance_data = []
    for i in range(len(current_train_performance["train_cost"])):
        train_performance_data_point = TrainPerformanceDataPoint()
        train_performance_data_point.step = current_train_performance["step"][i]
        train_performance_data_point.epoch = current_train_performance["epoch"][i]
        train_performance_data_point.current_learning_rate = current_train_performance["learning_rate"][i]
        train_performance_data_point.cost = current_train_performance["train_cost"][i]
        train_performance_object.train_performance_data.append(train_performance_data_point)

    return train_performance_object, 200


def build_grid_search_ann(inputParameterLists):
    """
    passes all learning and ANN parameters to the server
    Includes learning parameters and ANN topology as lists

    :param inputParameterLists: object with all tunable parameter lists
    :type inputParameterLists: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        inputParameterLists = ParameterList.from_dict(connexion.request.get_json())

        all_parameter_combinations = generate_parameter_combination_list(inputParameterLists)

        # print(all_parameter_combinations)

        # update tuning status
        Storage.tuning_status = "creating"

        # generate model for each combination
        for parameter_combination in all_parameter_combinations:
            # generate model object
            unique_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S-") + str(uuid.uuid4())[:8]
            ann_model = ModelStorage(parameter_combination, unique_id)

            # generate unique folder for each ann
            if 'session_saver_path' in parameter_combination:
                unique_path = os.path.join(parameter_combination['session_saver_path'], unique_id)
            else:
                unique_path = os.path.join('./save/', unique_id)
            parameter_combination['session_saver_path'] = unique_path
            if not os.path.exists(unique_path):
                os.makedirs(unique_path)

            # generate ann
            cae = SklearnCAE(**parameter_combination)

            ann_model.ann = cae

            Storage.tuning_ANNs.append(ann_model)
            Storage.tuning_ANN_model_ids.append(unique_id)

        # anns = Storage.tuning_ANNs

        # update tuning status
        Storage.tuning_status = "created"

        return str(len(all_parameter_combinations)) + ' CAEs created', 200

    return "ANNs couldn't be created", 415


def get_train_performance_of_specific_tuning(modelId):  # noqa: E501
    """returns the complete set of scalar train variables to a given model

    as list of dicts

    :param modelId: model id of the exspected parameter set
    :type modelId: str

    :rtype: TrainPerformance
    """
    # get model by id
    model_storage = Storage.get_tune_model(modelId)

    # catch key not found error
    if model_storage is None:
        return "Model ID not found", 415

    # build up response object and return it
    train_performance_object = TrainPerformance()
    train_performance_object.model_id = model_storage.id
    train_performance_object.train_status = Storage.tuning_status
    train_performance_object.train_performance_data = []
    for i in range(len(model_storage.train_performance["train_cost"])):
        train_performance_data_point = TrainPerformanceDataPoint()
        train_performance_data_point.step = model_storage.train_performance["step"][i]
        train_performance_data_point.epoch = model_storage.train_performance["epoch"][i]
        train_performance_data_point.current_learning_rate = model_storage.train_performance["learning_rate"][i]
        train_performance_data_point.cost = model_storage.train_performance["train_cost"][i]
        train_performance_object.train_performance_data.append(train_performance_data_point)

    return train_performance_object, 200
    # cae = Storage.get_cae()
    #
    # # get previous training step:
    # prev_step = Storage.get_prev_training_step()
    #
    # # get current training status:
    # current_train_status = cae.get_train_status(start_idx=prev_step)
    #
    # # update previous training step:
    # Storage.update_prev_training_step(len(current_train_status["train_cost"]))
    #
    # # build up response object and return it
    # train_performance_object = TrainPerformance()
    # train_performance_object.cost = current_train_status["train_cost"]
    # train_performance_object.current_learning_rate = current_train_status["learning_rate"]
    # if Storage.cae_thread.isAlive():
    #     train_performance_object.train_status = "running"
    # else:
    #     train_performance_object.train_status = "finished"
    #
    # return train_performance_object, 200


def get_tune_parameter(modelId):  # noqa: E501
    """returns the parameter set of the ANN with the given model id

    returns a object of type ParameterList # noqa: E501

    :param modelId: model id of the expected parameter set
    :type modelId: str

    :rtype: ParameterList
    """
    # get model by id
    model_storage = Storage.get_tune_model(modelId)

    # catch key not found error
    if model_storage is None:
        return "Model ID not found", 415
    return model_storage.parameter_set, 200
