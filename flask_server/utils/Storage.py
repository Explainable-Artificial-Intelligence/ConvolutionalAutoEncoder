"""includes a static class which stores all server data"""
import threading

from flask_server.swagger_server.models.parameter_list import ParameterList


class Storage(object):
    # storrage items
    input_data = {}
    input_data_ranking_to_input = {}
    input_data_input_to_ranking = {}
    input_data_clustering = {}
    input_batch_indices = {}

    # current active model:
    output_data = {}
    latent_representation_data = {}
    score_data = {}
    output_batch_indices = {}
    cae = object()
    parameter_set = ParameterList()
    model_id = ""
    cae_thread = threading.Thread()
    prediction_thread = {}
    train_step = 0

    tuning_ANNs = []
    tuning_ANN_model_ids = []
    tuning_thread = threading.Thread()
    tuning_queue = object()
    tuning_status = ""
    tuning_dataset_name = "train_data"

    clustering_data = {}
    clustering_status = {}
    clustering_thread = threading.Thread()

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
    def set_output_data(cls, datasetname, train_data_output):
        cls.output_data[datasetname] = train_data_output

    @classmethod
    def get_output_data(cls, dataset_name="train_data"):
        return cls.output_data[dataset_name]

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
    def get_current_batch_index(cls, dataset_name, output):
        if output:
            if not dataset_name in cls.output_batch_indices.keys():
                cls.output_batch_indices[dataset_name] = 0
            return cls.output_batch_indices[dataset_name]
        else:
            if not dataset_name in cls.input_batch_indices.keys():
                cls.input_batch_indices[dataset_name] = 0
            return cls.input_batch_indices[dataset_name]

    @classmethod
    def get_dataset_length(cls, dataset_name, output):
        if output:
            return len(cls.output_data[dataset_name])
        else:
            return len(cls.input_data[dataset_name])

    @classmethod
    def update_batch_index(cls, dataset_name, output, next_batch_index):
        if output:
            cls.output_batch_indices[dataset_name] = next_batch_index
        else:
            cls.input_batch_indices[dataset_name] = next_batch_index

    @classmethod
    def output_images_computed(cls, datasetname):
        return datasetname in cls.output_data.keys()

    @classmethod
    def latent_representation_computed(cls, datasetname):
        return datasetname in cls.latent_representation_data.keys()

    @classmethod
    def get_output_image_by_id(cls, datasetname, id):
        dataset = cls.output_data[datasetname]
        return dataset[id]

    @classmethod
    def get_prev_training_step(cls):
        return cls.train_step

    @classmethod
    def update_prev_training_step(cls, set_size):
        cls.train_step += set_size

    @classmethod
    def get_parameter_list(cls):
        return cls.parameter_set

    @classmethod
    def set_parameter_list(cls, parameter_set):
        cls.parameter_set = parameter_set

    @classmethod
    def get_tune_model(cls, model_id):
        if model_id in cls.tuning_ANN_model_ids:
            return cls.tuning_ANNs[cls.tuning_ANN_model_ids.index(model_id)]
        return None
