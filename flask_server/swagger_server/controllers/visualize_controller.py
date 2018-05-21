import threading

import connexion

from flask_server.swagger_server.models.cluster_parameters import ClusterParameters
from flask_server.swagger_server.models.clustering import Clustering
from flask_server.swagger_server.models.point2_d import Point2D
from flask_server.utils.Clustering import perform_clustering
from flask_server.utils.Storage import Storage


def compute_hidden_layer_latent_clustering(algorithm, dimension_reduction, dataset_name='train_data', layer=0,
                                           cluster_parameters=None):  # noqa: E501
    """starts the clustering of the latent representation of a hidden layer

    starts the clustering of the latent representation of a hidden layer # noqa: E501

    :param algorithm: determines the clutering algorithm
    :type algorithm: str
    :param dimension_reduction: determines the algorithm for dim reduction
    :type dimension_reduction: str
    :param dataset_name: determines the dataset which should be clustered
    :type dataset_name: str
    :param layer: determines the hidden layer
    :type layer: int
    :param cluster_parameters: determines the clutering parameters
    :type cluster_parameters: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        cluster_parameters = ClusterParameters.from_dict(connexion.request.get_json())

        # define background thread:
        clustering_thread = threading.Thread(target=perform_clustering,
                                             args=(
                                                 algorithm, cluster_parameters, dataset_name, dimension_reduction,
                                                 layer,))
        Storage.set_cae_thread(clustering_thread)
        # start clustering:
        clustering_thread.start()

        return "clustering started", 200

    return 'parsing Error!', 415


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


def get_hidden_layer_latent_clustering(dataset_name='train_data', layer=0):
    """returns the clustering of the latent representation of a hidden layer

    returns the clustering of the latent representation of a hidden layer # noqa: E501

    :param dataset_name: determines the dataset which should be clustered
    :type dataset_name: str
    :param layer: determines the hidden layer
    :type layer: int

    :rtype: Clustering
    """

    if (dataset_name, layer) not in Storage.clustering_status.keys():
        return "clustering not found", 404

    if Storage.clustering_status[(dataset_name, layer)].startswith('running'):
        return "clustering still running", 102

    if Storage.clustering_status[(dataset_name, layer)] == "finished":
        return Storage.clustering_data[(dataset_name, layer)], 200


def get_pretrained_model_as_zip():  # noqa: E501
    """returns a zip file with the pre trained model as runable python script

     # noqa: E501


    :rtype: file
    """
    return 'do some magic!'
