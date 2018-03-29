"""
Helper functions to handle the communication between Storage and ANN
"""
import itertools

from flask_server.swagger_server.models.image import Image
from flask_server.swagger_server.models.processed_image_data import ProcessedImageData
from flask_server.utils.ImageProcessing import convert_image_array_to_byte_string
from flask_server.utils.Storage import Storage


def compute_output_images(datasetname):
    # check if output images already computed
    if not Storage.output_images_computed(datasetname):
        # compute all output images for this dataset:

        # get CAE
        cae = Storage.get_cae()
        # predict train images
        output_images = cae.predict(Storage.input_data[datasetname])
        # save prediction
        Storage.output_data[datasetname] = output_images


def generate_parameter_list_from_dict(parameter_dict):
    """
    generates a list of parameter combinations from a given parameter set as dict or object
    :param parameter_dict: parameter set as dict or object
    :return: list of parameter set dicts
    """
    # check if input is dict and convert it otherwise:
    if not type(parameter_dict) is dict:
        # convert object to dict:
        temp_dict = {}
        for key in parameter_dict.__dict__.keys():
            if key.startswith('_'):
                temp_dict[key[1:]] = parameter_dict.__dict__[key]

        parameter_dict = temp_dict

    # split parameter list in static and variable parameters:
    static_parameter_list = {}
    variable_parameter_list = {}
    for key in parameter_dict.keys():
        dict_elem = parameter_dict[key]
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
    parameter_combination_list = [dict(parameter_combination, **static_parameter_list) for parameter_combination in
                                  variable_parameter_combinations]

    return parameter_combination_list


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
    # parameter_list['rw_seed'] = [None if seed == -1 else seed for seed in parameter_list['rw_seed']]
    # parameter_list['rb_seed'] = [None if seed == -1 else seed for seed in parameter_list['rb_seed']]

    # get 1st level parameter set:
    parameter_combinations_with_all_dicts = generate_parameter_list_from_dict(parameter_list)

    # unpack learning rate dict:
    parameter_combinations_w_o_learning_rate = []
    for parameter_combination in parameter_combinations_with_all_dicts:
        # unpack learning rate dict:
        lr_lists = generate_parameter_list_from_dict(parameter_combination['learning_rate_dict'])

        # remove dicts from parameter set:
        parameter_combination.pop('learning_rate_dict', None)

        # concatenate with list element:
        for lr_combination in lr_lists:
            parameter_combinations_w_o_learning_rate.append(dict(parameter_combination, **lr_combination))

    # unpack cost function dict:
    parameter_combinations_w_o_cost_function = []
    for parameter_combination in parameter_combinations_w_o_learning_rate:
        # unpack learning rate dict:
        cf_lists = generate_parameter_list_from_dict(parameter_combination['cost_function_dict'])

        # remove dicts from parameter set:
        parameter_combination.pop('cost_function_dict', None)

        # concatenate with list element:
        for cf_combination in cf_lists:
            parameter_combinations_w_o_cost_function.append(dict(parameter_combination, **cf_combination))

    # unpack random bias dict:
    parameter_combinations_w_o_random_biases = []
    for parameter_combination in parameter_combinations_w_o_cost_function:
        # unpack learning rate dict:
        rb_lists = generate_parameter_list_from_dict(parameter_combination['random_biases_dict'])

        # remove dicts from parameter set:
        parameter_combination.pop('random_biases_dict', None)

        # concatenate with list element:
        for rb_combination in rb_lists:
            # generate new parameter list:
            new_parameter_combination = dict(parameter_combination)
            # move elements from biases dict:
            for key in rb_combination.keys():
                if key == 'random_function':
                    new_parameter_combination['random_function_for_biases'] = rb_combination[key]
                else:
                    new_parameter_combination['rb_' + key] = rb_combination[key]

            parameter_combinations_w_o_random_biases.append(new_parameter_combination)

    # unpack random weights dict:
    parameter_combinations_w_o_random_weights = []
    for parameter_combination in parameter_combinations_w_o_random_biases:
        # unpack learning rate dict:
        rw_lists = generate_parameter_list_from_dict(parameter_combination['random_weights_dict'])

        # remove dicts from parameter set:
        parameter_combination.pop('random_weights_dict', None)

        # concatenate with list element:
        for rw_combination in rw_lists:
            # generate new parameter list:
            new_parameter_combination = dict(parameter_combination)
            # move elements from biases dict:
            for key in rw_combination.keys():
                if key == 'random_function':
                    new_parameter_combination['random_function_for_weights'] = rw_combination[key]
                else:
                    new_parameter_combination['rw_' + key] = rw_combination[key]

            parameter_combinations_w_o_random_weights.append(new_parameter_combination)

    # set standard values:
    for parameter_combination in parameter_combinations_w_o_random_weights:
        # set default values to None for input shape, seeds and weights:
        if parameter_combination['input_shape'][0] == -1:
            parameter_combination['input_shape'][0] = None
        if parameter_combination['rw_seed'] == -1:
            parameter_combination['rw_seed'] = None
        if parameter_combination['rb_seed'] == -1:
            parameter_combination['rb_seed'] = None
        if parameter_combination['cf_weights'] == [0.0]:
            parameter_combination['cf_weights'] = None

        # remove 'none' parameters:
        keys_to_remove = []
        for key in parameter_combination.keys():
            if parameter_combination[key] is None:
                keys_to_remove.append(key)
        for key in keys_to_remove:
            parameter_combination.pop(key, None)

    return parameter_combinations_w_o_random_weights


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

        # latent_img = Image()
        # # TODO: find better way to display latent representation as image
        # # perform dim reduction to create image
        # shape = status_images["latent_representation"][i].shape
        # new_shape = [shape[0], shape[1] * shape[2]]
        # latent_img.bytestring = convert_image_array_to_byte_string(
        #     perform_dimension_reduction(status_images["latent_representation"][i].reshape(new_shape)), channels=1,
        #     normalize=True)
        # latent_img.id = int(status_images["indices"][i])
        # processed_image_data.latent_layer.append(latent_img)
    return processed_image_data
