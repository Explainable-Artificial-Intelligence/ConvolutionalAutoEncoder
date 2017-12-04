"""includes a static class which stores all server data"""
import threading

import numpy as np


class Storage(object):
    # storrage items
    input_data = {}
    input_batch_indices = {}
    output_data = []
    cae = object()
    parameter_set = {}
    cae_thread = threading.Thread()

    @classmethod
    def set_input_data(cls, train_data, dataset_name="train_data"):
        cls.input_data[dataset_name] = train_data

    @classmethod
    def get_input_data(cls, dataset_name="train_data"):
        return cls.input_data[dataset_name]

    @classmethod
    def set_cae(cls, cae):
        cls.cae = cae

    @classmethod
    def get_cae(cls):
        return cls.cae

    @classmethod
    def set_output_data(cls, train_data_output):
        cls.output_data = train_data_output

    @classmethod
    def get_output_image(cls, image_id):
        return cls.output_data[image_id]

    @classmethod
    def set_cae_thread(cls, cae_thread):
        cls.cae_thread = cae_thread

    @classmethod
    def get_cae_thread(cls):
        return cls.cae_thread

    @classmethod
    def get_current_batch_index(cls, dataset_name, dataset_type):
        if dataset_type == "input":
            if not dataset_name in cls.input_batch_indices.keys():
                cls.input_batch_indices[dataset_name] = 0
            return cls.input_batch_indices[dataset_name]

        pass

    @classmethod
    def get_dataset_length(cls, dataset_name, dataset_type):
        if dataset_type == "input":
            return len(cls.input_data[dataset_name])

        pass

    @classmethod
    def update_batch_index(cls, dataset_name, dataset_type, next_batch_index):
        if dataset_type == "input":
            cls.input_batch_indices[dataset_name] = next_batch_index

        pass


