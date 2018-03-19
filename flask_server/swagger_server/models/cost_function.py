# coding: utf-8

from __future__ import absolute_import

from typing import List  # noqa: F401

from flask_server.swagger_server import util
from flask_server.swagger_server.models.base_model_ import Model


class CostFunction(Model):
    """NOTE: This class is auto generated by the swagger code generator program.

    Do not edit the class manually.
    """

    def __init__(self, cf_cost_function: str = 'squared_pixel_distance', cf_max_val: List[float] = None,
                 cf_filter_size: List[float] = None, cf_filter_sigma: List[float] = None, cf_k1: List[float] = None,
                 cf_k2: List[float] = None, cf_weights: List[List[float]] = None):  # noqa: E501
        """CostFunction - a model defined in Swagger

        :param cf_cost_function: The cf_cost_function of this CostFunction.  # noqa: E501
        :type cf_cost_function: str
        :param cf_max_val: The cf_max_val of this CostFunction.  # noqa: E501
        :type cf_max_val: List[float]
        :param cf_filter_size: The cf_filter_size of this CostFunction.  # noqa: E501
        :type cf_filter_size: List[float]
        :param cf_filter_sigma: The cf_filter_sigma of this CostFunction.  # noqa: E501
        :type cf_filter_sigma: List[float]
        :param cf_k1: The cf_k1 of this CostFunction.  # noqa: E501
        :type cf_k1: List[float]
        :param cf_k2: The cf_k2 of this CostFunction.  # noqa: E501
        :type cf_k2: List[float]
        :param cf_weights: The cf_weights of this CostFunction.  # noqa: E501
        :type cf_weights: List[List[float]]
        """
        self.swagger_types = {
            'cf_cost_function': str,
            'cf_max_val': List[float],
            'cf_filter_size': List[float],
            'cf_filter_sigma': List[float],
            'cf_k1': List[float],
            'cf_k2': List[float],
            'cf_weights': List[List[float]]
        }

        self.attribute_map = {
            'cf_cost_function': 'cf_cost_function',
            'cf_max_val': 'cf_max_val',
            'cf_filter_size': 'cf_filter_size',
            'cf_filter_sigma': 'cf_filter_sigma',
            'cf_k1': 'cf_k1',
            'cf_k2': 'cf_k2',
            'cf_weights': 'cf_weights'
        }

        self._cf_cost_function = cf_cost_function
        self._cf_max_val = cf_max_val
        self._cf_filter_size = cf_filter_size
        self._cf_filter_sigma = cf_filter_sigma
        self._cf_k1 = cf_k1
        self._cf_k2 = cf_k2
        self._cf_weights = cf_weights

    @classmethod
    def from_dict(cls, dikt) -> 'CostFunction':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The CostFunction of this CostFunction.  # noqa: E501
        :rtype: CostFunction
        """
        return util.deserialize_model(dikt, cls)

    @property
    def cf_cost_function(self) -> str:
        """Gets the cf_cost_function of this CostFunction.


        :return: The cf_cost_function of this CostFunction.
        :rtype: str
        """
        return self._cf_cost_function

    @cf_cost_function.setter
    def cf_cost_function(self, cf_cost_function: str):
        """Sets the cf_cost_function of this CostFunction.


        :param cf_cost_function: The cf_cost_function of this CostFunction.
        :type cf_cost_function: str
        """

        self._cf_cost_function = cf_cost_function

    @property
    def cf_max_val(self) -> List[float]:
        """Gets the cf_max_val of this CostFunction.


        :return: The cf_max_val of this CostFunction.
        :rtype: List[float]
        """
        return self._cf_max_val

    @cf_max_val.setter
    def cf_max_val(self, cf_max_val: List[float]):
        """Sets the cf_max_val of this CostFunction.


        :param cf_max_val: The cf_max_val of this CostFunction.
        :type cf_max_val: List[float]
        """

        self._cf_max_val = cf_max_val

    @property
    def cf_filter_size(self) -> List[float]:
        """Gets the cf_filter_size of this CostFunction.


        :return: The cf_filter_size of this CostFunction.
        :rtype: List[float]
        """
        return self._cf_filter_size

    @cf_filter_size.setter
    def cf_filter_size(self, cf_filter_size: List[float]):
        """Sets the cf_filter_size of this CostFunction.


        :param cf_filter_size: The cf_filter_size of this CostFunction.
        :type cf_filter_size: List[float]
        """

        self._cf_filter_size = cf_filter_size

    @property
    def cf_filter_sigma(self) -> List[float]:
        """Gets the cf_filter_sigma of this CostFunction.


        :return: The cf_filter_sigma of this CostFunction.
        :rtype: List[float]
        """
        return self._cf_filter_sigma

    @cf_filter_sigma.setter
    def cf_filter_sigma(self, cf_filter_sigma: List[float]):
        """Sets the cf_filter_sigma of this CostFunction.


        :param cf_filter_sigma: The cf_filter_sigma of this CostFunction.
        :type cf_filter_sigma: List[float]
        """

        self._cf_filter_sigma = cf_filter_sigma

    @property
    def cf_k1(self) -> List[float]:
        """Gets the cf_k1 of this CostFunction.


        :return: The cf_k1 of this CostFunction.
        :rtype: List[float]
        """
        return self._cf_k1

    @cf_k1.setter
    def cf_k1(self, cf_k1: List[float]):
        """Sets the cf_k1 of this CostFunction.


        :param cf_k1: The cf_k1 of this CostFunction.
        :type cf_k1: List[float]
        """

        self._cf_k1 = cf_k1

    @property
    def cf_k2(self) -> List[float]:
        """Gets the cf_k2 of this CostFunction.


        :return: The cf_k2 of this CostFunction.
        :rtype: List[float]
        """
        return self._cf_k2

    @cf_k2.setter
    def cf_k2(self, cf_k2: List[float]):
        """Sets the cf_k2 of this CostFunction.


        :param cf_k2: The cf_k2 of this CostFunction.
        :type cf_k2: List[float]
        """

        self._cf_k2 = cf_k2

    @property
    def cf_weights(self) -> List[List[float]]:
        """Gets the cf_weights of this CostFunction.


        :return: The cf_weights of this CostFunction.
        :rtype: List[List[float]]
        """
        return self._cf_weights

    @cf_weights.setter
    def cf_weights(self, cf_weights: List[List[float]]):
        """Sets the cf_weights of this CostFunction.


        :param cf_weights: The cf_weights of this CostFunction.
        :type cf_weights: List[List[float]]
        """

        self._cf_weights = cf_weights