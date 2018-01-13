# coding: utf-8

from __future__ import absolute_import

from flask_server.swagger_server.util import deserialize_model
from .base_model_ import Model


class Image(Model):
    """
    NOTE: This class is auto generated by the swagger code generator program.
    Do not edit the class manually.
    """
    def __init__(self, bytestring: str=None, id: int=None):
        """
        Image - a model defined in Swagger

        :param bytestring: The bytestring of this Image.
        :type bytestring: str
        :param id: The id of this Image.
        :type id: int
        """
        self.swagger_types = {
            'bytestring': str,
            'id': int
        }

        self.attribute_map = {
            'bytestring': 'bytestring',
            'id': 'id'
        }

        self._bytestring = bytestring
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
    def bytestring(self) -> str:
        """
        Gets the bytestring of this Image.

        :return: The bytestring of this Image.
        :rtype: str
        """
        return self._bytestring

    @bytestring.setter
    def bytestring(self, bytestring: str):
        """
        Sets the bytestring of this Image.

        :param bytestring: The bytestring of this Image.
        :type bytestring: str
        """

        self._bytestring = bytestring

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
