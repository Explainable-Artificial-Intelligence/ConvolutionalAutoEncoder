# coding: utf-8

from __future__ import absolute_import

from typing import List

from flask_server.swagger_server import util
from flask_server.swagger_server.models.base_model_ import Model
from flask_server.swagger_server.models.train_performance_data_point import TrainPerformanceDataPoint  # noqa: F401,E501


class TrainPerformance(Model):
    """NOTE: This class is auto generated by the swagger code generator program.

    Do not edit the class manually.
    """

    def __init__(self, model_id: str = None, train_status: str = None,
                 train_performance_data: List[TrainPerformanceDataPoint] = None):  # noqa: E501
        """TrainPerformance - a model defined in Swagger

        :param model_id: The model_id of this TrainPerformance.  # noqa: E501
        :type model_id: str
        :param train_status: The train_status of this TrainPerformance.  # noqa: E501
        :type train_status: str
        :param train_performance_data: The train_performance_data of this TrainPerformance.  # noqa: E501
        :type train_performance_data: List[TrainPerformanceDataPoint]
        """
        self.swagger_types = {
            'model_id': str,
            'train_status': str,
            'train_performance_data': List[TrainPerformanceDataPoint]
        }

        self.attribute_map = {
            'model_id': 'model_id',
            'train_status': 'train_status',
            'train_performance_data': 'train_performance_data'
        }

        self._model_id = model_id
        self._train_status = train_status
        self._train_performance_data = train_performance_data

    @classmethod
    def from_dict(cls, dikt) -> 'TrainPerformance':
        """Returns the dict as a model

        :param dikt: A dict.
        :type: dict
        :return: The TrainPerformance of this TrainPerformance.  # noqa: E501
        :rtype: TrainPerformance
        """
        return util.deserialize_model(dikt, cls)

    @property
    def model_id(self) -> str:
        """Gets the model_id of this TrainPerformance.


        :return: The model_id of this TrainPerformance.
        :rtype: str
        """
        return self._model_id

    @model_id.setter
    def model_id(self, model_id: str):
        """Sets the model_id of this TrainPerformance.


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
    def train_performance_data(self) -> List[TrainPerformanceDataPoint]:
        """Gets the train_performance_data of this TrainPerformance.


        :return: The train_performance_data of this TrainPerformance.
        :rtype: List[TrainPerformanceDataPoint]
        """
        return self._train_performance_data

    @train_performance_data.setter
    def train_performance_data(self, train_performance_data: List[TrainPerformanceDataPoint]):
        """Sets the train_performance_data of this TrainPerformance.


        :param train_performance_data: The train_performance_data of this TrainPerformance.
        :type train_performance_data: List[TrainPerformanceDataPoint]
        """

        self._train_performance_data = train_performance_data
