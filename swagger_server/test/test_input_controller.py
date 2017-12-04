# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.input_data import InputData
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestInputController(BaseTestCase):
    """ InputController integration test stubs """

    def test_get_input_images(self):
        """
        Test case for get_input_images

        returns a subset of input images
        """
        query_string = [('datasetname', 'datasetname_example'),
                        ('startIndex', 56),
                        ('endIndex', 56)]
        response = self.client.open('/v2/input/getImages',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_next_input_image_batch(self):
        """
        Test case for get_next_input_image_batch

        returns the next batch of input images
        """
        query_string = [('datasetname', 'datasetname_example'),
                        ('batchSize', 56)]
        response = self.client.open('/v2/input/getImageBatch',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_load_train_data(self):
        """
        Test case for load_train_data

        Load a train data file
        """
        query_string = [('filename', 'filename_example'),
                        ('datasetname', 'datasetname_example')]
        response = self.client.open('/v2/input/loadFile',
                                    method='POST',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
