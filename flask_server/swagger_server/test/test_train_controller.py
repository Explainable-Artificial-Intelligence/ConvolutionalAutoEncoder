# coding: utf-8

from __future__ import absolute_import

from flask import json
from swagger_server.models.train_status import TrainStatus  # noqa: E501
from swagger_server.test import BaseTestCase


class TestTrainController(BaseTestCase):
    """TrainController integration test stubs"""

    def test_control_training(self):
        """Test case for control_training

        starts, pauses and stops the training
        """
        trainStatus = TrainStatus()
        response = self.client.open(
            '/v2/train/controlTraining',
            method='POST',
            data=json.dumps(trainStatus),
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_processed_image_data(self):
        """Test case for get_processed_image_data

        returns a subset of the current train images and the corresponding latent representation and output
        """
        query_string = [('setSize', 56)]
        response = self.client.open(
            '/v2/train/getProcessedImageData',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_train_performance(self):
        """Test case for get_train_performance

        returns the next batch of scalar train variables
        """
        response = self.client.open(
            '/v2/train/getTrainPerformance',
            method='GET',
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
