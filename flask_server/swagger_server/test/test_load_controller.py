# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.image_data import ImageData
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestLoadController(BaseTestCase):
    """ LoadController integration test stubs """

    def test_get_image_batch(self):
        """
        Test case for get_image_batch

        returns the next batch of input/output images
        """
        query_string = [('batch_size', 100),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open('/v2/load/getImageBatch',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_image_by_id(self):
        """
        Test case for get_image_by_id

        returns a single input/output image
        """
        query_string = [('id', 56),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open('/v2/load/getImageById',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_images(self):
        """
        Test case for get_images

        returns a subset of input/output images
        """
        query_string = [('start_idx', 0),
                        ('end_idx', 10),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open('/v2/load/getImages',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_random_images(self):
        """
        Test case for get_random_images

        returns the next batch of input/output images
        """
        query_string = [('batch_size', 100),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open('/v2/load/getRandomImages',
                                    method='GET',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_load_file(self):
        """
        Test case for load_file

        Load a train/test data file
        """
        query_string = [('filename', 'data/mnist_train_data.npy'),
                        ('datasetname', 'train_data'),
                        ('read_labels', false),
                        ('data_type', 'auto')]
        response = self.client.open('/v2/load/loadFile',
                                    method='POST',
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
