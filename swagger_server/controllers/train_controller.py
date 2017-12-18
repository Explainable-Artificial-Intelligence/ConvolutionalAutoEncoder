import threading

import connexion
from swagger_server.models.current_train_images import CurrentTrainImages
from swagger_server.models.current_train_status import CurrentTrainStatus
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

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


def get_current_ann_images(setSize):
    """
    returns a subset of the current train images and the corresponding latent representation and output
    
    :param setSize: size of the image subset
    :type setSize: int

    :rtype: CurrentTrainImages
    """
    return 'do some magic!'


def get_current_train_status():
    """
    returns the next batch of scalar train variables
    as dict of lists

    :rtype: CurrentTrainStatus
    """
    return 'do some magic!'
