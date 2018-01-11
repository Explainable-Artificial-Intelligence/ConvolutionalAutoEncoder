"""
Helper functions to handle the communication between Storage and ANN
"""
import itertools

from flask_server.swagger_server.models.image import Image
from flask_server.swagger_server.models.processed_image_data import ProcessedImageData
from flask_server.utils.DimensionReduction import perform_dimension_reduction
from flask_server.utils.ImageProcessing import convert_image_array_to_byte_string
from flask_server.utils.Storage import Storage


def compute_output_images(datasetname):
    # check if output images already computed
    if not Storage.output_images_computed(datasetname):
        # compute all output images for this dataset:

        # get CAE
        cae = Storage.get_cae()
        # predict train images
        output_images = cae.predict(Storage.get_input_data(datasetname))
        # save prediction
        Storage.set_output_data(datasetname, output_images)


class TuningQueue(object):
    """
    A class which allows too execute the parameter tuning in a different thread and supports controls and stats
    """

    tuning_status = ""
    current_running_model = object()

    def __init__(self):
        pass

    def run_tuning(self, train_data, test_data=None):
        # iterate over all combinations
        for parameter_combination in Storage.tuning_ANNs:

            # start training for this parameter combination:
            self.current_running_model = parameter_combination
            self.current_running_model.ann.fit(train_data)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                break

            if test_data is not None:
                # perform a scoring of the test data
                scoring = self.current_running_model.ann.score(test_data)
                print(sum(scoring))
                parameter_combination.final_score = sum(scoring)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                break

    def stop_tuning(self):
        # abort tuning queue
        self.tuning_status = "stop"

        # abort current training
        self.current_running_model.ann.update_ann_status("stop")

    def get_training_performance(self):
        # get current running cae:
        cae = self.current_running_model.ann

        # get previous training step:
        prev_step = self.current_running_model.train_step

        # get current training status:
        current_train_performance = cae.get_train_status(start_idx=prev_step)

        # update previous training step:
        self.current_running_model.train_step += len(current_train_performance["train_cost"])

        return current_train_performance

    def get_processed_image_data(self, set_size=100):
        return self.current_running_model.ann.get_current_status_images(set_size)


def generate_parameter_combination_list(input_parameter_list: object):
    """
    helper function to generate a tuning parameter list form a ParameterList object
    :type input_parameter_list: ParameterList
    """
    # generate parameter dict from ParameterList object
    parameter_list = {key[1:]: input_parameter_list.__dict__[key] for key in input_parameter_list.__dict__.keys() if
                      key.startswith('_')}
    # set default values to None for input shape and seeds:
    for input_shape in parameter_list['input_shape']:
        # replace first dim (-1) with None (variable size):
        if input_shape[0] == -1:
            input_shape[0] = None
    # set default seed to None if -1 is given
    parameter_list['rw_seed'] = [None if seed == -1 else seed for seed in parameter_list['rw_seed']]
    parameter_list['rb_seed'] = [None if seed == -1 else seed for seed in parameter_list['rb_seed']]

    # split parameter list in static and variable parameters:
    static_parameter_list = {}
    variable_parameter_list = {}
    for key in parameter_list.keys():
        dict_elem = parameter_list[key]
        if type(dict_elem) is list:
            if len(dict_elem) > 1:
                variable_parameter_list[key] = dict_elem
            else:
                static_parameter_list[key] = dict_elem[0]
        else:
            static_parameter_list[key] = dict_elem

    # generate list with all parameter combinations:
    variable_parameter_combinations = list(
        dict(zip(variable_parameter_list, x)) for x in itertools.product(*variable_parameter_list.values()))
    # concat each combination with the static parameter list
    all_parameter_combinations = [dict(parameter_combination, **static_parameter_list) for parameter_combination in
                                  variable_parameter_combinations]
    return all_parameter_combinations


def generate_status_image_object_from_status_images(status_images):
    # create response object
    processed_image_data = ProcessedImageData([])
    processed_image_data.input_layer = []
    processed_image_data.output_layer = []
    processed_image_data.latent_layer = []

    # special case: training is still in first epoch (no pictures available)
    if len(status_images["input_images"].shape) < 4:
        # return an empty response object
        return processed_image_data

    # get num of channels
    channels = status_images["input_images"].shape[3]
    print(status_images["latent_representation"].shape)
    # generate CurrentTrainImages object
    for i in range(len(status_images["indices"])):
        # generate input image
        input_img = Image()
        input_img.bytestring = convert_image_array_to_byte_string(status_images["input_images"][i], channels=channels,
                                                                  normalize=True)
        input_img.id = int(status_images["indices"][i])
        processed_image_data.input_layer.append(input_img)

        output_img = Image()
        output_img.bytestring = convert_image_array_to_byte_string(status_images["output_images"][i], channels=channels,
                                                                   normalize=True)
        output_img.id = int(status_images["indices"][i])
        processed_image_data.output_layer.append(output_img)

        latent_img = Image()
        # TODO: find better way to display latent representation as image
        # perform dim reduction to create image
        shape = status_images["latent_representation"][i].shape
        new_shape = [shape[0], shape[1] * shape[2]]
        latent_img.bytestring = convert_image_array_to_byte_string(
            perform_dimension_reduction(status_images["latent_representation"][i].reshape(new_shape)), channels=1,
            normalize=True)
        latent_img.id = int(status_images["indices"][i])
        processed_image_data.latent_layer.append(latent_img)
    return processed_image_data
