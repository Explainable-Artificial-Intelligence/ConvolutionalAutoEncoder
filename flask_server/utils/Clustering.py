"""
contains some clustering function
"""
from sklearn.cluster import KMeans


def perform_kmeans_clustering(raw_input_data, n_clusters=8, init="k-means++", n_init=10, max_iter=300, tol=0.0001,
                              precompute_distances="auto", verbose=0, random_state=None, copy_x=True, n_jobs=-1,
                              algorithm="auto"):
    """
    computes the kmeans clustering on a given multidimensional dataset

    :param raw_input_data:
    :param n_clusters:
    :param init:
    :param n_init:
    :param max_iter:
    :param tol:
    :param precompute_distances:
    :param verbose:
    :param random_state:
    :param copy_x:
    :param n_jobs:
    :param algorithm:
    :return:
    """
    # init kmeans
    kmeans_clustering = KMeans(n_clusters=n_clusters, init=init, n_init=n_init, max_iter=max_iter, tol=tol,
                               precompute_distances=precompute_distances, verbose=verbose, random_state=random_state,
                               copy_x=copy_x, n_jobs=n_jobs, algorithm=algorithm)
    # perform clustering
    kmeans_clustering.fit(raw_input_data)

    return kmeans_clustering
