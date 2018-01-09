"""includes a static class which stores all server data"""
import threading

import numpy as np


class InputDataStorage(object):
    # storrage items
    input_data = {}
    input_batch_indices = {}

    @classmethod
    def get_current_batch_index(cls, dataset_name):
        if not dataset_name in cls.input_batch_indices.keys():
            cls.input_batch_indices[dataset_name] = 0
        return cls.input_batch_indices[dataset_name]

    @classmethod
    def get_dataset_length(cls, dataset_name):
        return len(cls.input_data[dataset_name])
