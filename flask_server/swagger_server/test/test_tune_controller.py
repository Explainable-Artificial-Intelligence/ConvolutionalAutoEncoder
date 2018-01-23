# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.parameter_list import ParameterList
from swagger_server.models.processed_image_data import ProcessedImageData
from swagger_server.models.train_performance import TrainPerformance
from swagger_server.models.train_status import TrainStatus
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestTuneController(BaseTestCase):
    """ TuneController integration test stubs """

    def test_control_tuning(self):
        """
        Test case for control_tuning

        starts, pauses and stops the tuning
        """
        trainStatus = TrainStatus()
        response = self.client.open('/v2/tune/controlTuning',
                                    method='PUT',
                                    data=json.dumps(trainStatus),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_processed_image_data_of_current_tuning(self):
        """
        Test case for get_processed_image_data_of_current_tuning

        returns a subset of the current train images and the corresponding latent representation and output
        """
        query_string = [('setSize', 56)]
        response = self.client.open('/v2/tune/getProcessedImageDataOfCurrentTuning',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_train_performance_of_current_tuning(self):
        """
        Test case for get_train_performance_of_current_tuning

        returns the next batch of scalar train variables
        """
        response = self.client.open('/v2/tune/getTrainPerformanceOfCurrentTuning',
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_pass_ann_parameter_lists(self):
        """
        Test case for pass_ann_parameter_lists

        passes all learning and ANN parameters to the server
        """
        inputParameterLists = ParameterList()
        response = self.client.open('/v2/tune/buildGridSearchANN',
                                    method='POST',
                                    data=json.dumps(inputParameterLists),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
