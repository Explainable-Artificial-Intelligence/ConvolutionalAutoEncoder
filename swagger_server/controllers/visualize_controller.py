import connexion
from swagger_server.models.clustering import Clustering
from swagger_server.models.image import Image
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def get_clustering(dimension=None):
    """
    returns the clustering of the latent representation
    
    :param dimension: dimension of the latent representation
    :type dimension: int

    :rtype: Clustering
    """
    return 'do some magic!'


def get_output_image(imageID, datasetname="train_data"):
    """
    returns the ANN output for a given input image ID
    
    :param imageID: id (position) of the input image
    :type imageID: int

    :rtype: Image
    """

    # check if output images already computed
    if not Storage.output_images_computed(datasetname):
        # compute all output images for this dataset:

        # get CAE
        cae = Storage.get_cae()
        # predict train images
        output_images = cae.predict(Storage.get_input_data(datasetname))
        # save prediction
        Storage.set_output_data(datasetname, output_images)

    # get the image as nd array
    output_image_array = Storage.get_output_image_by_id(datasetname, imageID)

    # create Image
    output_image = Image()
    output_image.id = imageID
    output_image.bytestring = str(
        convert_image_array_to_byte_string(output_image_array, channels=output_image_array.shape[2]))

    return output_image, 200


def load_test_data(filename):
    """
    Load a test data file
    Load a test data file in numpy array data format
    :param filename: retruns the test data images for a given file path
    :type filename: str

    :rtype: None
    """
    return 'do some magic!'
