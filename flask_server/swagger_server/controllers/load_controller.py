import sys

from flask_server.swagger_server.models.image import Image
from flask_server.swagger_server.models.image_data import ImageData
from flask_server.utils.ANNHelperFunctions import compute_output_images, compute_latent_representation
from flask_server.utils.FileParser import load_input_data, list_data_files, save_data_file
from flask_server.utils.ImageProcessing import convert_image_array_to_byte_string
from flask_server.utils.Sorting import apply_sorting
from flask_server.utils.Storage import Storage


def get_available_data_sets():
    """get available data sets

    returns a list of available data set files # noqa: E501


    :rtype: List[str]
    """
    return list_data_files()


def get_loaded_data_sets():
    """get loaded data sets

    returns a list of loaded data sets # noqa: E501


    :rtype: List[str]
    """
    return list(Storage.input_data.keys())


def get_image_batch(batch_size=100, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns the next batch of input/output images
    images are encoded as png byte strings
    :param batch_size: defines the number of return images
    :type batch_size: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    current_batch_index = Storage.get_current_batch_index(datasetname, output)

    next_batch_index = min(current_batch_index + batch_size, Storage.get_dataset_length(datasetname, output))

    result = get_images(current_batch_index, next_batch_index, datasetname, output=output, sort_by=sort_by)

    # if operation successful, update batch index
    if result[1] == 200:
        Storage.update_batch_index(datasetname, output, next_batch_index)

    return result


def get_image_by_id(id=None, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns a single input/output image
    images are encoded as png byte strings
    :param id: defines the id of the images
    :type id: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """

    # create Image
    image = Image()
    image.id = id

    if output:
        # check if output images already computed
        compute_output_images(datasetname)
        # get the image as nd array
        image_array = Storage.output_data[datasetname][id]
        image.cost = Storage.score_data[datasetname][id]
    else:
        # get the image as nd array
        image_array = Storage.input_data[datasetname][id]
        image.cost = 0.0

    # convert image array to byte string
    image.bytestring = convert_image_array_to_byte_string(image_array, channels=image_array.shape[2])

    return image, 200


def get_images(start_idx, end_idx, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns a subset of input/output images
    images are encoded as png byte strings
    :param start_idx: name for dataset on the server
    :type start_idx: int
    :param end_idx: name for dataset on the server
    :type end_idx: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    if start_idx < 0 or end_idx < 0:
        return 'Index error: < 0', 415
    if start_idx > end_idx:
        return 'Index Error: start > end', 415

    try:
        if output:
            # check if output images already computed
            compute_output_images(datasetname)
            image_data = Storage.output_data[datasetname]
        else:
            image_data = Storage.input_data[datasetname]

    except KeyError:
        return 'No data found', 404

    if end_idx > Storage.get_dataset_length(datasetname, output):
        return 'Index out of bounds', 415

    input_images = ImageData()
    input_images.num_images = end_idx - start_idx
    input_images.res_x = image_data.shape[1]
    input_images.res_y = image_data.shape[2]
    input_images.images = []
    for i in range(start_idx, end_idx):
        image = Image()
        image.cost = 0.0
        image.id = i
        # TODO : use byte array
        image.bytestring = convert_image_array_to_byte_string(image_data[i], channels=image_data.shape[3])
        input_images.images.append(image)

    # sort images:
    if sort_by == "color" and not output:
        input_images.images.sort(
            key=lambda image: Storage.input_data_input_to_ranking[(datasetname, "color")][image.id])

    # save train data
    Storage.set_input_data(image_data)

    return input_images, 200


def get_latent_representation_by_id(id, datasetname=None):
    """returns a single latent representation as ()list of) png images

    images are encoded as png byte strings

    :param id: defines the id of the images
    :type id: int
    :param datasetname: name for dataset on the server
    :type datasetname: str

    :rtype: List[ImageData]
    """
    # check if output images already computed
    compute_latent_representation(datasetname)
    # get the image as nd array
    image_array = Storage.latent_representation_data[datasetname][id]

    # generate latent image grid:
    latent_img_data = ImageData()
    latent_img_data.res_x = image_array.shape[0]
    latent_img_data.res_y = image_array.shape[1]
    latent_img_data.images = []

    if image_array.shape[2] <= 3:
        # if possible: display latent layer in one image
        latent_img = Image()
        latent_img.cost = 0.0
        latent_img.bytestring = convert_image_array_to_byte_string(image_array, channels=image_array.shape[2],
                                                                   normalize=True)
        latent_img.id = id
        latent_img_data.images.append(latent_img)
    else:
        # if not: create a list of images for each layer:
        for stack in range(image_array.shape[2]):
            latent_img = Image()
            latent_img.cost = 0.0
            latent_img.bytestring = convert_image_array_to_byte_string(image_array[:, :, stack], channels=1,
                                                                       normalize=True)
            latent_img.id = id
            latent_img_data.images.append(latent_img)

    return [latent_img_data], 200


def get_random_images(batch_size=100, datasetname="train_data", sort_by=None, filter=None, output=False):
    """
    returns the next batch of input/output images
    images are encoded as png byte strings
    :param batch_size: defines the number of return images
    :type batch_size: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sort_by: defines the sorting of the input images
    :type sort_by: str
    :param filter: the values which should be filtered (whitelist)
    :type filter: str
    :param output: if true returns AE output Images instead of input Images
    :type output: bool

    :rtype: ImageData
    """
    return 'do some magic!'


def load_file(filename, datasetname="unknown", read_labels=None, data_type="auto"):
    """
    Load a train/test data file
    Load a data file in different data formats
    :param filename: 
    :type filename: str
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param read_labels: true to read labels
    :type read_labels: bool
    :param data_type: determines the data format of the input file
    :type data_type: str

    :rtype: None
    """

    supported_data_types = ["auto", "npy", "zip"]

    if data_type in supported_data_types:
        print("input file/folder: %s" % filename, file=sys.stderr)

        response, response_code, input_data = load_input_data(filename, data_type)
        if response_code == 200:
            # save train data
            Storage.set_input_data(input_data, datasetname)

            # apply sorting:
            apply_sorting(datasetname)

        return response, response_code
    else:
        print("unsupported data type: %s" % data_type, file=sys.stderr)
        return "unsupported data type: %s" % data_type, 415


def reset_all_batch_indices():
    """
    resets all batch indices of all image sets
    resets all batch indices of all image sets

    :rtype: None
    """

    # reset input and output batch indices
    Storage.input_batch_indices = {key: 0 for key in Storage.input_batch_indices.keys()}
    Storage.output_batch_indices = {key: 0 for key in Storage.output_batch_indices.keys()}

    # reset train step:
    Storage.train_step = 0

    return 'All batch indices successfully reset', 200


def reset_batch_index(dataset_name="train_data", output=False):
    """
    resets the batch index of the image set
    resets the batch index of the image set
    :param dataset_name: name for dataset on the server
    :type dataset_name: str
    :param output: reset output image batch index instead of input images
    :type output: bool

    :rtype: None
    """
    try:
        if output:
            Storage.output_batch_indices[dataset_name] = 0
        else:
            Storage.input_batch_indices[dataset_name] = 0
        return 'Batch index reset', 200
    except KeyError:
        return 'dataset not found', 404


def upload_file(upfile):
    """uploads a data file

    Load a data file in different data formats # noqa: E501

    :param upfile: The file to upload.
    :type upfile: werkzeug.datastructures.FileStorage

    :rtype: None
    """

    return save_data_file(upfile)
