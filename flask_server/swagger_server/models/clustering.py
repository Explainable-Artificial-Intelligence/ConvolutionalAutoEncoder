# coding: utf-8

from __future__ import absolute_import
from flask_server.swagger_server.models.point2_d import Point2D
from .base_model_ import Model
from datetime import date, datetime
from typing import List, Dict
from ..util import deserialize_model


class Clustering(Model):
    """
    NOTE: This class is auto generated by the swagger code generator program.
    Do not edit the class manually.
    """
    def __init__(self, min_x: float=None, max_x: float=None, min_y: float=None, max_y: float=None, n_clusters: int=None, points: List[Point2D]=None):
        """
        Clustering - a model defined in Swagger

        :param min_x: The min_x of this Clustering.
        :type min_x: float
        :param max_x: The max_x of this Clustering.
        :type max_x: float
        :param min_y: The min_y of this Clustering.
        :type min_y: float
        :param max_y: The max_y of this Clustering.
        :type max_y: float
        :param n_clusters: The n_clusters of this Clustering.
        :type n_clusters: int
        :param points: The points of this Clustering.
        :type points: List[Point2D]
        """
        self.swagger_types = {
            'min_x': float,
            'max_x': float,
            'min_y': float,
            'max_y': float,
            'n_clusters': int,
            'points': List[Point2D]
        }

        self.attribute_map = {
            'min_x': 'minX',
            'max_x': 'maxX',
            'min_y': 'minY',
            'max_y': 'maxY',
            'n_clusters': 'nClusters',
            'points': 'points'
        }

        self._min_x = min_x
        self._max_x = max_x
        self._min_y = min_y
        self._max_y = max_y
        self._n_clusters = n_clusters
        self._points = points

    @classmethod
    def from_dict(cls, dikt) -> 'Clustering':
        """
        Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The Clustering of this Clustering.
        :rtype: Clustering
        """
        return deserialize_model(dikt, cls)

    @property
    def min_x(self) -> float:
        """
        Gets the min_x of this Clustering.

        :return: The min_x of this Clustering.
        :rtype: float
        """
        return self._min_x

    @min_x.setter
    def min_x(self, min_x: float):
        """
        Sets the min_x of this Clustering.

        :param min_x: The min_x of this Clustering.
        :type min_x: float
        """

        self._min_x = min_x

    @property
    def max_x(self) -> float:
        """
        Gets the max_x of this Clustering.

        :return: The max_x of this Clustering.
        :rtype: float
        """
        return self._max_x

    @max_x.setter
    def max_x(self, max_x: float):
        """
        Sets the max_x of this Clustering.

        :param max_x: The max_x of this Clustering.
        :type max_x: float
        """

        self._max_x = max_x

    @property
    def min_y(self) -> float:
        """
        Gets the min_y of this Clustering.

        :return: The min_y of this Clustering.
        :rtype: float
        """
        return self._min_y

    @min_y.setter
    def min_y(self, min_y: float):
        """
        Sets the min_y of this Clustering.

        :param min_y: The min_y of this Clustering.
        :type min_y: float
        """

        self._min_y = min_y

    @property
    def max_y(self) -> float:
        """
        Gets the max_y of this Clustering.

        :return: The max_y of this Clustering.
        :rtype: float
        """
        return self._max_y

    @max_y.setter
    def max_y(self, max_y: float):
        """
        Sets the max_y of this Clustering.

        :param max_y: The max_y of this Clustering.
        :type max_y: float
        """

        self._max_y = max_y

    @property
    def n_clusters(self) -> int:
        """
        Gets the n_clusters of this Clustering.

        :return: The n_clusters of this Clustering.
        :rtype: int
        """
        return self._n_clusters

    @n_clusters.setter
    def n_clusters(self, n_clusters: int):
        """
        Sets the n_clusters of this Clustering.

        :param n_clusters: The n_clusters of this Clustering.
        :type n_clusters: int
        """

        self._n_clusters = n_clusters

    @property
    def points(self) -> List[Point2D]:
        """
        Gets the points of this Clustering.

        :return: The points of this Clustering.
        :rtype: List[Point2D]
        """
        return self._points

    @points.setter
    def points(self, points: List[Point2D]):
        """
        Sets the points of this Clustering.

        :param points: The points of this Clustering.
        :type points: List[Point2D]
        """

        self._points = points

