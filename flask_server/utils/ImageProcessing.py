"""
this file contains all image processing methods
"""
import base64
import io

import numpy as np
from PIL import Image


def convert_image_array_to_byte_string(image_array, channels=1, normalize=True):
    """
    converts a numpy array into a PNG byte string
    :param image_array:
    :param channels:
    :param normalize:
    :return:
    """

    if normalize:
        image_array = (image_array - image_array.min()) / (image_array.max() - image_array.min()) * 255

    if channels == 1:
        # convert array values to uint8 and reshape to 2D
        image_data = image_array.reshape(image_array.shape[:2]).astype('uint8')
    else:
        # only convert to uint8
        image_data = image_array.astype('uint8')
    image = Image.fromarray(image_data.astype('uint8'))

    # generate byte string
    image_byte_array = io.BytesIO()
    image.save(image_byte_array, format='PNG')
    image_byte_array = image_byte_array.getvalue()

    # return byte string
    return str(base64.b64encode(image_byte_array))


def compute_average_color(image_array):
    """
    computes the average color/layer mean of a given array of images
    :param image_array:
    :return: list of colors
    """
    shape = image_array.shape

    colors = [[np.mean(image[:, :, i]) for i in range(shape[3])] for image in image_array]

    return colors
