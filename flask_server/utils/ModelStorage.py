"""includes a static class which stores all server data"""
import threading


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
    train_status = ""
    train_step = 0
    final_score = 0

    # ann train stats
    train_performance = {}
    train_images = {}

    def __init__(self, parameter_set, model_id):
        self.parameter_set = parameter_set
        self.id = model_id
