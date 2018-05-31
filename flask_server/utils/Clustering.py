"""
contains some clustering function
"""
import threading

import numpy as np
from sklearn.cluster import KMeans

from flask_server.swagger_server.models.clustering import Clustering
from flask_server.swagger_server.models.point2_d import Point2D
from flask_server.utils.ANNHelperFunctions import compute_latent_representation
from flask_server.utils.DimensionReduction import reshape_into_2D_array, perform_dimension_reduction
from flask_server.utils.Storage import Storage


def perform_kmeans_clustering(raw_input_data, cluster_parameter):
    """
    computes the kmeans clustering on a given multidimensional dataset

    :param cluster_parameter:
    :param raw_input_data:

    :return:
    """
    # convert precompute_distances parameter:
    if cluster_parameter.precompute_distances != 'auto':
        cluster_parameter.precompute_distances = cluster_parameter.precompute_distances == 'true'
    # overwrite invalid random state:
    if cluster_parameter.random_state < 0:
        cluster_parameter.random_state = None
    # init kmeans
    kmeans_clustering = KMeans(n_clusters=cluster_parameter.n_clusters, init=cluster_parameter.init,
                               n_init=cluster_parameter.n_init, max_iter=cluster_parameter.max_iter,
                               tol=cluster_parameter.tol, precompute_distances=cluster_parameter.precompute_distances,
                               verbose=cluster_parameter.verbose, random_state=cluster_parameter.random_state,
                               copy_x=cluster_parameter.copy_x, n_jobs=cluster_parameter.n_jobs,
                               algorithm=cluster_parameter.algorithm)
    # perform clustering
    kmeans_clustering.fit(raw_input_data)

    return kmeans_clustering


def perform_clustering(algorithm, cluster_parameters, dataset_name, dimension_reduction, layer):
    """
        computes clustering on a given dataset name and performs a dimension reduction

        :return:
    """

    # TODO: remove workaround
    # dirty fix to allow multicore:
    threading.current_thread().name = 'MainThread'

    # set clustering status:
    Storage.clustering_status[(dataset_name, layer)] = "running, getting layer data"
    print("running, getting layer data")
    # get latent representation
    compute_latent_representation(dataset_name)
    latent_representation = Storage.latent_representation_data[dataset_name]
    # convert array into feature table
    flat_latent_representation = reshape_into_2D_array(latent_representation)

    # set clustering status:
    Storage.clustering_status[(dataset_name, layer)] = "running, performing clustering"
    print("running, performing clustering")
    # perform clustering
    kmeans_clustering = perform_kmeans_clustering(flat_latent_representation, cluster_parameters)
    Storage.input_data_clustering[dataset_name] = kmeans_clustering.predict(flat_latent_representation)

    # set clustering status:
    Storage.clustering_status[(dataset_name, layer)] = "running, performing dimension reduction"
    print("running, performing dimension reduction")
    # perform dimension reduction
    latent_representation_2d = perform_dimension_reduction(flat_latent_representation,
                                                           algorithm=dimension_reduction, n_dimensions=2)
    # set clustering status:
    Storage.clustering_status[(dataset_name, layer)] = "running, saving data"
    print("running, saving data")
    # create Clustering object
    clustering = Clustering()
    # transfer properties
    clustering.n_clusters = cluster_parameters.n_clusters
    clustering.min_x = float(np.min(latent_representation_2d[:, 0]))
    clustering.max_x = float(np.max(latent_representation_2d[:, 0]))
    clustering.min_y = float(np.min(latent_representation_2d[:, 1]))
    clustering.max_y = float(np.max(latent_representation_2d[:, 1]))
    clustering.points = []
    # generate cluster points:
    for i in range(latent_representation_2d.shape[0]):
        point = Point2D(x=float(latent_representation_2d[i, 0]), y=float(latent_representation_2d[i, 1]),
                        cluster=int(Storage.input_data_clustering[dataset_name][i]))
        clustering.points.append(point)

    # save data in Storage class
    Storage.clustering_data[(dataset_name, layer)] = clustering

    # set clustering status:
    Storage.clustering_status[(dataset_name, layer)] = "finished"
    print("finished")
    return
