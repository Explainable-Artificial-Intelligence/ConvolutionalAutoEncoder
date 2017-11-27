# coding: utf-8

from __future__ import absolute_import
from .base_model_ import Model
from datetime import date, datetime
from typing import List, Dict
from ..util import deserialize_model


class Image(Model):
    """
    NOTE: This class is auto generated by the swagger code generator program.
    Do not edit the class manually.
    """
    def __init__(self, data: List[str]=None, id: int=None):
        """
        Image - a model defined in Swagger

        :param data: The data of this Image.
        :type data: List[str]
        :param id: The id of this Image.
        :type id: int
        """
        self.swagger_types = {
            'data': List[str],
            'id': int
        }

        self.attribute_map = {
            'data': 'data',
            'id': 'id'
        }

        self._data = data
        self._id = id

    @classmethod
    def from_dict(cls, dikt) -> 'Image':
        """
        Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The Image of this Image.
        :rtype: Image
        """
        return deserialize_model(dikt, cls)

    @property
    def data(self) -> List[str]:
        """
        Gets the data of this Image.

        :return: The data of this Image.
        :rtype: List[str]
        """
        return self._data

    @data.setter
    def data(self, data: List[str]):
        """
        Sets the data of this Image.

        :param data: The data of this Image.
        :type data: List[str]
        """

        self._data = data

    @property
    def id(self) -> int:
        """
        Gets the id of this Image.

        :return: The id of this Image.
        :rtype: int
        """
        return self._id

    @id.setter
    def id(self, id: int):
        """
        Sets the id of this Image.

        :param id: The id of this Image.
        :type id: int
        """

        self._id = id

