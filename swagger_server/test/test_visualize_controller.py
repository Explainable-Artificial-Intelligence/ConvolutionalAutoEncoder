# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.clustering import Clustering
from swagger_server.models.image import Image
from swagger_server.models.input_data import InputData
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestVisualizeController(BaseTestCase):
    """ VisualizeController integration test stubs """

    def test_get_clustering(self):
        """
        Test case for get_clustering

        returns the clustering of the latent representation
        """
        query_string = [('dimension', 56)]
        response = self.client.open('/v2/visualize',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_output_image(self):
        """
        Test case for get_output_image

        returns the ANN output for a given input image ID
        """
        response = self.client.open('/v2/visualize/{imageID}'.format(imageID=56),
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_load_test_data(self):
        """
        Test case for load_test_data

        Load a test data file
        """
        response = self.client.open('/v2/visualize/load/{filename}'.format(filename='filename_example'),
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
