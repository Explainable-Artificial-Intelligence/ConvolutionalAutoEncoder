import datetime
import os
import threading
import uuid

import connexion

from flask_server.ConvolutionalAutoEncoder import SklearnCAE
from flask_server.swagger_server.models.parameter_list import ParameterList
from flask_server.swagger_server.models.train_performance import TrainPerformance
from flask_server.swagger_server.models.train_status import TrainStatus
from flask_server.utils.ANNHelperFunctions import TuningQueue, generate_status_image_object_from_status_images, \
    generate_parameter_combination_list
from flask_server.utils.ModelStorage import ModelStorage
from flask_server.utils.Storage import Storage


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


def get_train_performance_of_current_tuning():
    """
    returns the next batch of scalar train variables
    as list of dicts

    :rtype: TrainPerformance
    """

    # get current training status:
    current_train_performance = Storage.tuning_queue.get_training_performance()

    # build up response object and return it
    train_performance_object = TrainPerformance()
    train_performance_object.cost = current_train_performance["train_cost"]
    train_performance_object.current_learning_rate = current_train_performance["learning_rate"]
    train_performance_object.model_id = Storage.tuning_queue.current_running_model.id

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

        print(all_parameter_combinations)

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

        anns = Storage.tuning_ANNs

    return 'CAEs created', 200
