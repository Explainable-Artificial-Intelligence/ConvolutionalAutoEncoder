"""includes a static class which stores all server data"""
import threading

import numpy as np


class ModelStorage(object):
    # model options
    parameter_set = {}
    id = str()

    # output data
    output_data = {}
    output_batch_indices = {}

    # ann stats
    ann = object()
    cae_thread = threading.Thread()
    train_step = 0
    final_score = 0

    def __init__(self, parameter_set, id):
        self.parameter_set = parameter_set
        self.id = id


