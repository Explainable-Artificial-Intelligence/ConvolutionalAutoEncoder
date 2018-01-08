import connexion
import numpy as np

from swagger_server.models.cluster_parameters import ClusterParameters
from swagger_server.models.clustering import Clustering
from swagger_server.models.image import Image
from swagger_server.models.point2_d import Point2D
from datetime import date, datetime
from typing import List, Dict
from six import iteritems

from utils.Clustering import perform_kmeans_clustering
from utils.DimensionReduction import reshape_into_2D_array, perform_dimension_reduction
from utils.ImageProcessing import convert_image_array_to_byte_string
from utils.Storage import Storage
from ..util import deserialize_date, deserialize_datetime


def generate_image_from_single_point(point_2D):
    """
    generates the AE output from a given point of the sample distribution
    
    :param point_2D: 2D Point of the sample distribution
    :type point_2D: dict | bytes

    :rtype: Image
    """
    if connexion.request.is_json:
        point_2D = Point2D.from_dict(connexion.request.get_json())

    return 'do some magic!'


def get_hidden_layer_latent_clustering(algorithm=None, dataset_name=None, dimension_reduction=None, cluster_parameters=None, layer=None):
    """
    returns the clustering of the latent representation of a hidden layer
    
    :param algorithm: determines the clutering algorithm
    :type algorithm: str
    :param dataset_name: determines the dataset which should be clustered
    :type dataset_name: str
    :param dimension_reduction: determines the algorithm for dim reduction
    :type dimension_reduction: str
    :param cluster_parameters: determines the clutering parameters
    :type cluster_parameters: dict | bytes
    :param layer: determines the hidden layer
    :type layer: int

    :rtype: Clustering
    """
    if connexion.request.is_json:
        cluster_parameters = ClusterParameters.from_dict(connexion.request.get_json())

        # get cae
        cae = Storage.get_cae()

        # get latent representation
        input_data = Storage.get_input_data(dataset_name=dataset_name)
        latent_representation = cae.get_latent_representation(input_data)

        # convert array into feature table
        flat_latent_representation = reshape_into_2D_array(latent_representation)

        # perform clustering
        kmeans_clustering = perform_kmeans_clustering(flat_latent_representation, n_clusters=8, init="k-means++",
                                                      n_init=10,
                                                      max_iter=300, tol=0.0001, precompute_distances="auto", verbose=0,
                                                      random_state=None, copy_x=True, n_jobs=-1, algorithm="auto")
        labels = kmeans_clustering.predict(flat_latent_representation)

        # perform dimension reduction
        latent_representation_2D = perform_dimension_reduction(flat_latent_representation,
                                                               algorithm=dimension_reduction, n_dimensions=2)

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
            point = Point2D(x=float(latent_representation_2D[i, 0]), y=float(latent_representation_2D[i, 1]),
                            cluster=int(labels[i]))
            clustering.points.append(point)
        return clustering, 200

    return 'parsing Error!', 415
