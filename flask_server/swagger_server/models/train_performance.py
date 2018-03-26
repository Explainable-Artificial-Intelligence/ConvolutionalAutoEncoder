# coding: utf-8

from __future__ import absolute_import

from typing import List

from .base_model_ import Model
from ..util import deserialize_model


class TrainPerformance(Model):
    """
    NOTE: This class is auto generated by the swagger code generator program.
    Do not edit the class manually.
    """
    def __init__(self, model_id: str=None, cost: List[float]=None, current_learning_rate: List[float]=None):
        """
        TrainPerformance - a model defined in Swagger

        :param model_id: The model_id of this TrainPerformance.
        :type model_id: str
        :param train_status: The train_status of this TrainPerformance.  
        :type train_status: str
        :param cost: The cost of this TrainPerformance.  
        :type cost: List[float]
        :param current_learning_rate: The current_learning_rate of this TrainPerformance.
        :type current_learning_rate: List[float]
        """
        self.swagger_types = {
            'model_id': str,
            'cost': List[float],
            'current_learning_rate': List[float]
        }

        self.attribute_map = {
            'model_id': 'model_id',
            'cost': 'cost',
            'current_learning_rate': 'currentLearningRate'
        }

        self._model_id = model_id
        self._cost = cost
        self._current_learning_rate = current_learning_rate

    @classmethod
    def from_dict(cls, dikt) -> 'TrainPerformance':
        """
        Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The TrainPerformance of this TrainPerformance.
        :rtype: TrainPerformance
        """
        return deserialize_model(dikt, cls)

    @property
    def model_id(self) -> str:
        """
        Gets the model_id of this TrainPerformance.

        :return: The model_id of this TrainPerformance.
        :rtype: str
        """
        return self._model_id

    @model_id.setter
    def model_id(self, model_id: str):
        """
        Sets the model_id of this TrainPerformance.

        :param model_id: The model_id of this TrainPerformance.
        :type model_id: str
        """

        self._model_id = model_id

    @property
    def train_status(self) -> str:
        """Gets the train_status of this TrainPerformance.


        :return: The train_status of this TrainPerformance.
        :rtype: str
        """
        return self._train_status

    @train_status.setter
    def train_status(self, train_status: str):
        """Sets the train_status of this TrainPerformance.


        :param train_status: The train_status of this TrainPerformance.
        :type train_status: str
        """

        self._train_status = train_status

    @property
    def cost(self) -> List[float]:
        """Gets the cost of this TrainPerformance.


        :return: The cost of this TrainPerformance.
        :rtype: List[float]
        """
        return self._cost

    @cost.setter
    def cost(self, cost: List[float]):
        """
        Sets the cost of this TrainPerformance.

        :param cost: The cost of this TrainPerformance.
        :type cost: List[float]
        """

        self._cost = cost

    @property
    def current_learning_rate(self) -> List[float]:
        """
        Gets the current_learning_rate of this TrainPerformance.

        :return: The current_learning_rate of this TrainPerformance.
        :rtype: List[float]
        """
        return self._current_learning_rate

    @current_learning_rate.setter
    def current_learning_rate(self, current_learning_rate: List[float]):
        """
        Sets the current_learning_rate of this TrainPerformance.

        :param current_learning_rate: The current_learning_rate of this TrainPerformance.
        :type current_learning_rate: List[float]
        """

        self._current_learning_rate = current_learning_rate

