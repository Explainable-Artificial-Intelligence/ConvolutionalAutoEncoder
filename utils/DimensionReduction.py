"""
Function performing dim reduction
"""
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE


def perform_tSNE_reduction(high_dim_data, n_components=2, perplexity=30.0, early_exaggeration=12.0,
                           learning_rate=200.0, n_iter=1000, n_iter_without_progress=300, min_grad_norm=1e-07,
                           metric="euclidean", init="random", verbose=0, random_state=None, method="barnes_hut",
                           angle=0.5):
    """
    performs a t-SNE reduction on the given dataset
    :param high_dim_data:
    :param n_components:
    :param perplexity:
    :param early_exaggeration:
    :param learning_rate:
    :param n_iter:
    :param n_iter_without_progress:
    :param min_grad_norm:
    :param metric:
    :param init:
    :param verbose:
    :param random_state:
    :param method:
    :param angle:
    :return:
    """
    tSNE = TSNE(n_components=n_components, perplexity=perplexity, early_exaggeration=early_exaggeration,
                learning_rate=learning_rate, n_iter=n_iter, n_iter_without_progress=n_iter_without_progress,
                min_grad_norm=min_grad_norm, metric=metric, init=init, verbose=verbose, random_state=random_state,
                method=method, angle=angle)
    low_dim_data = tSNE.fit_transform(high_dim_data)
    return low_dim_data


def perform_PCA_reduction(high_dim_data, n_components=2, copy=True, whiten=False, svd_solver="auto", tol=0.0,
                          iterated_power="auto", random_state=None):
    """
    performs a PCA dimension reduction on the given dataset

    :param high_dim_data:
    :param n_components:
    :param copy:
    :param whiten:
    :param svd_solver:
    :param tol:
    :param iterated_power:
    :param random_state:
    :return:
    """
    pca = PCA(n_components=n_components, copy=copy, whiten=whiten, svd_solver=svd_solver, tol=tol,
              iterated_power=iterated_power, random_state=random_state)
    low_dim_data = pca.fit_transform(high_dim_data)
    return low_dim_data


def perform_dimension_reduction(high_dim_data, algorithm="t-SNE", n_dimensions=2, perplexity=30.0,
                                early_exaggeration=12.0, learning_rate=200.0, n_iter=1000, n_iter_without_progress=300,
                                min_grad_norm=1e-07, metric="euclidean", init="random", verbose=0, random_state=None,
                                method="barnes_hut", angle=0.5, copy=True, whiten=False, svd_solver="auto", tol=0.0,
                                iterated_power="auto"):
    """
    performs a dimension reduction for a given dataset

    :param high_dim_data:
    :param algorithm:
    :param n_dimensions:
    :param perplexity:
    :param early_exaggeration:
    :param learning_rate:
    :param n_iter:
    :param n_iter_without_progress:
    :param min_grad_norm:
    :param metric:
    :param init:
    :param verbose:
    :param random_state:
    :param method:
    :param angle:
    :param copy:
    :param whiten:
    :param svd_solver:
    :param tol:
    :param iterated_power:
    :return:
    """

    # perform t-SNE dim reduction:
    if algorithm == "t-SNE":
        low_dim_data = perform_tSNE_reduction(high_dim_data, n_components=n_dimensions, perplexity=perplexity,
                                              early_exaggeration=early_exaggeration, learning_rate=learning_rate,
                                              n_iter=n_iter, n_iter_without_progress=n_iter_without_progress,
                                              min_grad_norm=min_grad_norm, metric=metric, init=init, verbose=verbose,
                                              random_state=random_state, method=method, angle=angle)

        return low_dim_data
    # perform PCA
    if algorithm == "PCA":
        low_dim_data = perform_PCA_reduction(high_dim_data, n_components=n_dimensions, copy=copy, whiten=whiten,
                                             svd_solver=svd_solver, tol=tol, iterated_power=iterated_power,
                                             random_state=random_state)
        return low_dim_data


def reshape_into_2D_array(input_array):
    """
    reshapes a multidim numpy array into a 2D feature array

    :param input_array: n-dim. numpy array
    :return: 2D numpy array
    """

    # determine new array shape:
    old_shape = input_array.shape
    new_shape = [old_shape[0], np.prod(np.array(old_shape[1:]))]

    # reshape array
    reshaped_array = input_array.reshape(new_shape)

    return reshaped_array
