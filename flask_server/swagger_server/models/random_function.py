# coding: utf-8

from __future__ import absolute_import

from typing import List  # noqa: F401

from flask_server.swagger_server import util
from flask_server.swagger_server.models.base_model_ import Model


class RandomFunction(Model):
    """NOTE: This class is auto generated by the swagger code generator program.

    Do not edit the class manually.
    """

    def __init__(self, random_function: str = None, alpha: List[float] = None, beta: List[float] = None,
                 mean: List[float] = None, stddev: List[float] = None, lam: List[float] = None,
                 minval: List[float] = None, maxval: List[float] = None, seed: List[int] = None):  # noqa: E501
        """RandomFunction - a model defined in Swagger

        :param random_function: The random_function of this RandomFunction.  # noqa: E501
        :type random_function: str
        :param alpha: The alpha of this RandomFunction.  # noqa: E501
        :type alpha: List[float]
        :param beta: The beta of this RandomFunction.  # noqa: E501
        :type beta: List[float]
        :param mean: The mean of this RandomFunction.  # noqa: E501
        :type mean: List[float]
        :param stddev: The stddev of this RandomFunction.  # noqa: E501
        :type stddev: List[float]
        :param lam: The lam of this RandomFunction.  # noqa: E501
        :type lam: List[float]
        :param minval: The minval of this RandomFunction.  # noqa: E501
        :type minval: List[float]
        :param maxval: The maxval of this RandomFunction.  # noqa: E501
        :type maxval: List[float]
        :param seed: The seed of this RandomFunction.  # noqa: E501
        :type seed: List[int]
        """
        self.swagger_types = {
            'random_function': str,
            'alpha': List[float],
            'beta': List[float],
            'mean': List[float],
            'stddev': List[float],
            'lam': List[float],
            'minval': List[float],
            'maxval': List[float],
            'seed': List[int]
        }

        self.attribute_map = {
            'random_function': 'random_function',
            'alpha': 'alpha',
            'beta': 'beta',
            'mean': 'mean',
            'stddev': 'stddev',
            'lam': 'lam',
            'minval': 'minval',
            'maxval': 'maxval',
            'seed': 'seed'
        }

        self._random_function = random_function
        self._alpha = alpha
        self._beta = beta
        self._mean = mean
        self._stddev = stddev
        self._lam = lam
        self._minval = minval
        self._maxval = maxval
        self._seed = seed

    @classmethod
    def from_dict(cls, dikt) -> 'RandomFunction':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The RandomFunction of this RandomFunction.  # noqa: E501
        :rtype: RandomFunction
        """
        return util.deserialize_model(dikt, cls)

    @property
    def random_function(self) -> str:
        """Gets the random_function of this RandomFunction.


        :return: The random_function of this RandomFunction.
        :rtype: str
        """
        return self._random_function

    @random_function.setter
    def random_function(self, random_function: str):
        """Sets the random_function of this RandomFunction.


        :param random_function: The random_function of this RandomFunction.
        :type random_function: str
        """

        self._random_function = random_function

    @property
    def alpha(self) -> List[float]:
        """Gets the alpha of this RandomFunction.


        :return: The alpha of this RandomFunction.
        :rtype: List[float]
        """
        return self._alpha

    @alpha.setter
    def alpha(self, alpha: List[float]):
        """Sets the alpha of this RandomFunction.


        :param alpha: The alpha of this RandomFunction.
        :type alpha: List[float]
        """

        self._alpha = alpha

    @property
    def beta(self) -> List[float]:
        """Gets the beta of this RandomFunction.


        :return: The beta of this RandomFunction.
        :rtype: List[float]
        """
        return self._beta

    @beta.setter
    def beta(self, beta: List[float]):
        """Sets the beta of this RandomFunction.


        :param beta: The beta of this RandomFunction.
        :type beta: List[float]
        """

        self._beta = beta

    @property
    def mean(self) -> List[float]:
        """Gets the mean of this RandomFunction.


        :return: The mean of this RandomFunction.
        :rtype: List[float]
        """
        return self._mean

    @mean.setter
    def mean(self, mean: List[float]):
        """Sets the mean of this RandomFunction.


        :param mean: The mean of this RandomFunction.
        :type mean: List[float]
        """

        self._mean = mean

    @property
    def stddev(self) -> List[float]:
        """Gets the stddev of this RandomFunction.


        :return: The stddev of this RandomFunction.
        :rtype: List[float]
        """
        return self._stddev

    @stddev.setter
    def stddev(self, stddev: List[float]):
        """Sets the stddev of this RandomFunction.


        :param stddev: The stddev of this RandomFunction.
        :type stddev: List[float]
        """

        self._stddev = stddev

    @property
    def lam(self) -> List[float]:
        """Gets the lam of this RandomFunction.


        :return: The lam of this RandomFunction.
        :rtype: List[float]
        """
        return self._lam

    @lam.setter
    def lam(self, lam: List[float]):
        """Sets the lam of this RandomFunction.


        :param lam: The lam of this RandomFunction.
        :type lam: List[float]
        """

        self._lam = lam

    @property
    def minval(self) -> List[float]:
        """Gets the minval of this RandomFunction.


        :return: The minval of this RandomFunction.
        :rtype: List[float]
        """
        return self._minval

    @minval.setter
    def minval(self, minval: List[float]):
        """Sets the minval of this RandomFunction.


        :param minval: The minval of this RandomFunction.
        :type minval: List[float]
        """

        self._minval = minval

    @property
    def maxval(self) -> List[float]:
        """Gets the maxval of this RandomFunction.


        :return: The maxval of this RandomFunction.
        :rtype: List[float]
        """
        return self._maxval

    @maxval.setter
    def maxval(self, maxval: List[float]):
        """Sets the maxval of this RandomFunction.


        :param maxval: The maxval of this RandomFunction.
        :type maxval: List[float]
        """

        self._maxval = maxval

    @property
    def seed(self) -> List[int]:
        """Gets the seed of this RandomFunction.


        :return: The seed of this RandomFunction.
        :rtype: List[int]
        """
        return self._seed

    @seed.setter
    def seed(self, seed: List[int]):
        """Sets the seed of this RandomFunction.


        :param seed: The seed of this RandomFunction.
        :type seed: List[int]
        """

        self._seed = seed
