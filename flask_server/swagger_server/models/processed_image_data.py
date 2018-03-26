# coding: utf-8

from __future__ import absolute_import

from typing import List

from flask_server.swagger_server.models.image import Image
from .base_model_ import Model
from ..util import deserialize_model


class ProcessedImageData(Model):
    """
    NOTE: This class is auto generated by the swagger code generator program.
    Do not edit the class manually.
    """
    def __init__(self, input_layer: List[Image]=None, latent_layer: List[Image]=None, output_layer: List[Image]=None):
        """
        ProcessedImageData - a model defined in Swagger

        :param input_layer: The input_layer of this ProcessedImageData.
        :type input_layer: List[Image]
        :param latent_layer: The latent_layer of this ProcessedImageData.  
        :type latent_layer: List[List[Image]]
        :param output_layer: The output_layer of this ProcessedImageData.  
        :type output_layer: List[Image]
        """
        self.swagger_types = {
            'input_layer': List[Image],
            'latent_layer': List[List[Image]],
            'output_layer': List[Image]
        }

        self.attribute_map = {
            'input_layer': 'inputLayer',
            'latent_layer': 'latentLayer',
            'output_layer': 'outputLayer'
        }

        self._input_layer = input_layer
        self._latent_layer = latent_layer
        self._output_layer = output_layer

    @classmethod
    def from_dict(cls, dikt) -> 'ProcessedImageData':
        """
        Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The ProcessedImageData of this ProcessedImageData.
        :rtype: ProcessedImageData
        """
        return deserialize_model(dikt, cls)

    @property
    def input_layer(self) -> List[Image]:
        """
        Gets the input_layer of this ProcessedImageData.

        :return: The input_layer of this ProcessedImageData.
        :rtype: List[Image]
        """
        return self._input_layer

    @input_layer.setter
    def input_layer(self, input_layer: List[Image]):
        """
        Sets the input_layer of this ProcessedImageData.

        :param input_layer: The input_layer of this ProcessedImageData.
        :type input_layer: List[Image]
        """

        self._input_layer = input_layer

    @property
    def latent_layer(self) -> List[Image]:
        """
        Gets the latent_layer of this ProcessedImageData.

        :return: The latent_layer of this ProcessedImageData.
        :rtype: List[List[Image]]
        """
        return self._latent_layer

    @latent_layer.setter
    def latent_layer(self, latent_layer: List[Image]):
        """
        Sets the latent_layer of this ProcessedImageData.

        :param latent_layer: The latent_layer of this ProcessedImageData.
        :type latent_layer: List[List[Image]]
        """

        self._latent_layer = latent_layer

    @property
    def output_layer(self) -> List[Image]:
        """
        Gets the output_layer of this ProcessedImageData.

        :return: The output_layer of this ProcessedImageData.
        :rtype: List[Image]
        """
        return self._output_layer

    @output_layer.setter
    def output_layer(self, output_layer: List[Image]):
        """
        Sets the output_layer of this ProcessedImageData.

        :param output_layer: The output_layer of this ProcessedImageData.
        :type output_layer: List[Image]
        """

        self._output_layer = output_layer

