import os
import threading
import uuid

import connexion

from ConvolutionalAutoEncoder import SklearnCAE
from swagger_server.models.parameter_list import ParameterList
from swagger_server.models.train_status import TrainStatus
from utils.ANNHelperFunctions import TuningQueue
from utils.ModelStorage import ModelStorage
from utils.Storage import Storage


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


def pass_ann_parameter_lists(inputParameterLists):
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

        # generate model for each combination
        for parameter_combination in all_parameter_combinations:
            # generate model object
            unique_id = str(uuid.uuid1())
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



