# coding: utf-8

from __future__ import absolute_import

from flask import json
from swagger_server.models.parameter_list import ParameterList  # noqa: E501
from swagger_server.test import BaseTestCase


class TestBuildController(BaseTestCase):
    """BuildController integration test stubs"""

    def test_build_ann(self):
        """Test case for build_ann

        passes all learning and ANN parameters to the server
        """
        inputParameters = ParameterList()
        response = self.client.open(
            '/v2/build/buildANN',
            method='POST',
            data=json.dumps(inputParameters),
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_ann_parameter(self):
        """Test case for get_ann_parameter

        returns the parameter set of the created ANN
        """
        response = self.client.open(
            '/v2/build/getANNParameter',
            method='GET',
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_input_shape(self):
        """Test case for get_input_shape

        returns the input shape of the train data
        """
        query_string = [('dataset_name', 'train_data')]
        response = self.client.open(
            '/v2/build/getInputShape',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
