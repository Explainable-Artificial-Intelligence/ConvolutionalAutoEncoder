# coding: utf-8

from __future__ import absolute_import

from flask_server.swagger_server import util
from flask_server.swagger_server.models.base_model_ import Model


class Point2D(Model):
    """NOTE: This class is auto generated by the swagger code generator program.

    Do not edit the class manually.
    """

    def __init__(self, x: float = None, y: float = None, cluster: int = None):  # noqa: E501
        """Point2D - a model defined in Swagger

        :param x: The x of this Point2D.  # noqa: E501
        :type x: float
        :param y: The y of this Point2D.  # noqa: E501
        :type y: float
        :param cluster: The cluster of this Point2D.  # noqa: E501
        :type cluster: int
        """
        self.swagger_types = {
            'x': float,
            'y': float,
            'cluster': int
        }

        self.attribute_map = {
            'x': 'x',
            'y': 'y',
            'cluster': 'cluster'
        }

        self._x = x
        self._y = y
        self._cluster = cluster

    @classmethod
    def from_dict(cls, dikt) -> 'Point2D':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The Point2D of this Point2D.  # noqa: E501
        :rtype: Point2D
        """
        return util.deserialize_model(dikt, cls)

    @property
    def x(self) -> float:
        """Gets the x of this Point2D.


        :return: The x of this Point2D.
        :rtype: float
        """
        return self._x

    @x.setter
    def x(self, x: float):
        """Sets the x of this Point2D.


        :param x: The x of this Point2D.
        :type x: float
        """

        self._x = x

    @property
    def y(self) -> float:
        """Gets the y of this Point2D.


        :return: The y of this Point2D.
        :rtype: float
        """
        return self._y

    @y.setter
    def y(self, y: float):
        """Sets the y of this Point2D.


        :param y: The y of this Point2D.
        :type y: float
        """

        self._y = y

    @property
    def cluster(self) -> int:
        """Gets the cluster of this Point2D.


        :return: The cluster of this Point2D.
        :rtype: int
        """
        return self._cluster

    @cluster.setter
    def cluster(self, cluster: int):
        """Sets the cluster of this Point2D.


        :param cluster: The cluster of this Point2D.
        :type cluster: int
        """

        self._cluster = cluster
