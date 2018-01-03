import connexion
import numpy as np

from swagger_server.models import Model2DPoint
from swagger_server.models.clustering import Clustering
from swagger_server.models.image import Image
from swagger_server.models.input_data import InputData
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.Clustering import perform_kmeans_clustering
from utils.DimensionReduction import reshape_into_2D_array, perform_dimension_reduction
from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def get_clustering(algorithm="kmeans", datasetname="train_data", dim_reduction="PCA"):
    """
    returns the clustering of the latent representation
    
    :param algorithm: determines the clutering algorithm
    :type algorithm: str

    :rtype: Clustering
    """
    # get cae
    cae = Storage.get_cae()

    # get latent representation
    input_data = Storage.get_input_data(dataset_name=datasetname)
    latent_representation = cae.get_latent_representation(input_data)

    # convert array into feature table
    flat_latent_representation = reshape_into_2D_array(latent_representation)

    # perform clustering
    kmeans_clustering = perform_kmeans_clustering(flat_latent_representation, n_clusters=8, init="k-means++", n_init=10,
                                                  max_iter=300, tol=0.0001, precompute_distances="auto", verbose=0,
                                                  random_state=None, copy_x=True, n_jobs=-1, algorithm="auto")
    labels = kmeans_clustering.predict(flat_latent_representation)

    # perform dimension reduction
    latent_representation_2D = perform_dimension_reduction(flat_latent_representation, algorithm=dim_reduction,
                                                           n_dimensions=2)

    # create Clustering object
    clustering = Clustering()

    # transfer properties
    clustering.n_clusters = 10
    clustering.min_x = float(np.min(latent_representation_2D[:, 0]))
    clustering.max_x = float(np.max(latent_representation_2D[:, 0]))
    clustering.min_y = float(np.min(latent_representation_2D[:, 1]))
    clustering.max_y = float(np.max(latent_representation_2D[:, 1]))
    clustering.points = []

    # generate cluster points:
    for i in range(latent_representation_2D.shape[0]):
        point = Model2DPoint(x=float(latent_representation_2D[i, 0]), y=float(latent_representation_2D[i, 1]),
                             cluster=int(labels[i]))
        clustering.points.append(point)
    return clustering, 200


def get_next_output_image_batch(datasetname=None, batchSize=100, sortBy=None):
    """
    returns the next batch of input images
    images are encoded as png byte strings
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param batchSize: number of images for the next set
    :type batchSize: int
    :param sortBy: defines the sorting of the output images
    :type sortBy: str

    :rtype: InputData
    """
    # check if output images already computed
    compute_output_images(datasetname)

    current_batch_index = Storage.get_current_batch_index(datasetname, "output")

    next_batch_index = min(current_batch_index + batchSize, Storage.get_dataset_length(datasetname, "output"))

    result = get_output_images(current_batch_index, next_batch_index, datasetname)

    # if operation successful, update batch index
    if result[1] == 200:
        Storage.update_batch_index(datasetname, "output", next_batch_index)

    return result


def get_output_image(imageID, datasetname="train_data"):
    """
    returns the ANN output for a given input image ID
    
    :param imageID: id (position) of the input image
    :type imageID: int

    :rtype: Image
    """
    # check if output images already computed
    compute_output_images(datasetname)
    # get the image as nd array
    output_image_array = Storage.get_output_image_by_id(datasetname, imageID)

    # create Image
    output_image = Image()
    output_image.id = imageID
    output_image.bytestring = str(
        convert_image_array_to_byte_string(output_image_array, channels=output_image_array.shape[2]))

    return output_image, 200


def get_output_images(startIndex, endIndex, datasetname="train_data", sortBy=None):
    """
    returns a subset of output images
    images are encoded as png byte strings
    :param startIndex: start position of the image set
    :type startIndex: int
    :param endIndex: end position of the image set
    :type endIndex: int
    :param datasetname: name for dataset on the server
    :type datasetname: str
    :param sortBy: defines the sorting of the output images
    :type sortBy: str

    :rtype: InputData
    """
    if startIndex < 0 or endIndex < 0:
        return 'Index error: < 0', 415
    if startIndex > endIndex:
        return 'Index Error: start > end', 415

    # check if output images already computed
    compute_output_images(datasetname)
    try:
        output_data = Storage.get_output_data(datasetname)
    except KeyError:
        return 'No data found', 404

    if endIndex > Storage.get_dataset_length(datasetname, "output"):
        return 'Index out of bounds', 415

    output_images = InputData()
    output_images.num_images = endIndex - startIndex
    output_images.res_x = output_data.shape[1]
    output_images.res_y = output_data.shape[2]
    output_images.images = []
    for i in range(startIndex, endIndex):
        image = Image()
        image.id = i
        # TODO : use byte array
        image.bytestring = convert_image_array_to_byte_string(output_data[i], channels=output_data.shape[3])
        output_images.images.append(image)

    return output_images, 200


def load_additional_data(filename, datasetname="train_data"):
    """
    Load a train data file
    Load a train data file in numpy array data format
    :param filename: 
    :type filename: str
    :param datasetname: name for dataset on the server
    :type datasetname: str

    :rtype: None
    """
    return 'do some magic!'


def load_test_data(filename, datasetname="train_data"):
    """
    Load a test data file
    Load a test data file in numpy array data format
    :param filename: retruns the test data images for a given file path
    :type filename: str

    :rtype: None
    """
    return 'do some magic!'


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
