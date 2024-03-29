# coding: utf-8

from __future__ import absolute_import

from flask_server.swagger_server import util
from flask_server.swagger_server.models.base_model_ import Model


class TrainPerformanceDataPoint(Model):
    """NOTE: This class is auto generated by the swagger code generator program.

    Do not edit the class manually.
    """

    def __init__(self, epoch: float = None, step: float = None, cost: float = None,
                 current_learning_rate: float = None):  # noqa: E501
        """TrainPerformanceDataPoint - a model defined in Swagger

        :param epoch: The epoch of this TrainPerformanceDataPoint.  # noqa: E501
        :type epoch: float
        :param step: The step of this TrainPerformanceDataPoint.  # noqa: E501
        :type step: float
        :param cost: The cost of this TrainPerformanceDataPoint.  # noqa: E501
        :type cost: float
        :param current_learning_rate: The current_learning_rate of this TrainPerformanceDataPoint.  # noqa: E501
        :type current_learning_rate: float
        """
        self.swagger_types = {
            'epoch': float,
            'step': float,
            'cost': float,
            'current_learning_rate': float
        }

        self.attribute_map = {
            'epoch': 'epoch',
            'step': 'step',
            'cost': 'cost',
            'current_learning_rate': 'currentLearningRate'
        }

        self._epoch = epoch
        self._step = step
        self._cost = cost
        self._current_learning_rate = current_learning_rate

    @classmethod
    def from_dict(cls, dikt) -> 'TrainPerformanceDataPoint':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The TrainPerformanceDataPoint of this TrainPerformanceDataPoint.  # noqa: E501
        :rtype: TrainPerformanceDataPoint
        """
        return util.deserialize_model(dikt, cls)

    @property
    def epoch(self) -> float:
        """Gets the epoch of this TrainPerformanceDataPoint.


        :return: The epoch of this TrainPerformanceDataPoint.
        :rtype: float
        """
        return self._epoch

    @epoch.setter
    def epoch(self, epoch: float):
        """Sets the epoch of this TrainPerformanceDataPoint.


        :param epoch: The epoch of this TrainPerformanceDataPoint.
        :type epoch: float
        """

        self._epoch = epoch

    @property
    def step(self) -> float:
        """Gets the step of this TrainPerformanceDataPoint.


        :return: The step of this TrainPerformanceDataPoint.
        :rtype: float
        """
        return self._step

    @step.setter
    def step(self, step: float):
        """Sets the step of this TrainPerformanceDataPoint.


        :param step: The step of this TrainPerformanceDataPoint.
        :type step: float
        """

        self._step = step

    @property
    def cost(self) -> float:
        """Gets the cost of this TrainPerformanceDataPoint.


        :return: The cost of this TrainPerformanceDataPoint.
        :rtype: float
        """
        return self._cost

    @cost.setter
    def cost(self, cost: float):
        """Sets the cost of this TrainPerformanceDataPoint.


        :param cost: The cost of this TrainPerformanceDataPoint.
        :type cost: float
        """

        self._cost = cost

    @property
    def current_learning_rate(self) -> float:
        """Gets the current_learning_rate of this TrainPerformanceDataPoint.


        :return: The current_learning_rate of this TrainPerformanceDataPoint.
        :rtype: float
        """
        return self._current_learning_rate

    @current_learning_rate.setter
    def current_learning_rate(self, current_learning_rate: float):
        """Sets the current_learning_rate of this TrainPerformanceDataPoint.


        :param current_learning_rate: The current_learning_rate of this TrainPerformanceDataPoint.
        :type current_learning_rate: float
        """

        self._current_learning_rate = current_learning_rate
