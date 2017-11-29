import connexion

from Storage import Storage
from swagger_server.models.train_status import TrainStatus
from datetime import date, datetime
from typing import List, Dict
from six import iteritems
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
            train_data = Storage.get_train_data()
            # start training:
            cae.fit(train_data)

            # save output
            train_data_output = cae.predict(train_data)
            Storage.set_output_train_data(train_data_output)

        return "hello", 200
    return 'do some magic!'
