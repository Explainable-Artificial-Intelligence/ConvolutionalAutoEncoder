import colorsys

import numpy as np

from flask_server.utils.ImageProcessing import compute_average_color
from flask_server.utils.Storage import Storage


def rgb_step_sort(color, repetitions=1):
    """
    rgb step sort according to:
    https://www.alanzucconi.com/2015/09/30/colour-sorting/

    :param color:
    :param repetitions:
    :return:
    """

    lum = np.sqrt(.241 * color[0] + .691 * color[1] + .068 * color[2])

    h, s, v = colorsys.rgb_to_hsv(color[0], color[1], color[2])

    h2 = int(h * repetitions)
    lum2 = int(lum * repetitions)
    v2 = int(v * repetitions)

    if h2 % 2 == 1:
        v2 = repetitions - v2
    lum = repetitions - lum

    return h2, lum, v2


def apply_sorting(data_set_name):
    """
    computes the ranking of the image array

    :param data_set_name:
    :return:
    """

    # sort by color/luminance:
    Storage.input_data_ranking_to_input[(data_set_name, "color")], Storage.input_data_input_to_ranking[
        (data_set_name, "color")] = sort_by_color(data_set_name)
    return


def sort_by_color(data_set_name):
    """
    returns the sorting by color for given data set name

    :param data_set_name:
    :return:
    """

    # compute avg color of each image:
    avg_colors = compute_average_color(Storage.input_data[data_set_name])

    ranking = list(range(len(avg_colors)))
    if len(avg_colors[0]) == 3:
        # perform rgb luminance sort:
        ranking.sort(key=lambda x: rgb_step_sort(avg_colors[x], 8))
    else:
        # sort by mean layer intensity:
        ranking.sort(key=lambda x: np.mean(avg_colors[x]))

    # create reverse mapping:
    reverse_ranking = [0] * len(ranking)
    for i in range(len(ranking)):
        reverse_ranking[ranking[i]] = i

    return ranking, reverse_ranking
