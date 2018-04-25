# coding: utf-8

from __future__ import absolute_import

from six import BytesIO
from swagger_server.test import BaseTestCase


class TestLoadController(BaseTestCase):
    """LoadController integration test stubs"""

    def test_get_available_data_sets(self):
        """Test case for get_available_data_sets

        get available data sets
        """
        response = self.client.open(
            '/v2/load/getAvailableDataSets',
            method='GET',
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_image_batch(self):
        """Test case for get_image_batch

        returns the next batch of input/output images
        """
        query_string = [('batch_size', 100),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open(
            '/v2/load/getImageBatch',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_image_by_id(self):
        """Test case for get_image_by_id

        returns a single input/output image
        """
        query_string = [('id', 56),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open(
            '/v2/load/getImageById',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_images(self):
        """Test case for get_images

        returns a subset of input/output images
        """
        query_string = [('start_idx', 0),
                        ('end_idx', 10),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open(
            '/v2/load/getImages',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_latent_representation_by_id(self):
        """Test case for get_latent_representation_by_id

        returns a single latent representation as ()list of) png images
        """
        query_string = [('id', 56),
                        ('datasetname', 'train_data')]
        response = self.client.open(
            '/v2/load/getLatentRepresentationById',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_get_random_images(self):
        """Test case for get_random_images

        returns the next batch of input/output images
        """
        query_string = [('batch_size', 100),
                        ('datasetname', 'train_data'),
                        ('sort_by', 'sort_by_example'),
                        ('filter', 'filter_example'),
                        ('output', false)]
        response = self.client.open(
            '/v2/load/getRandomImages',
            method='GET',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_load_file(self):
        """Test case for load_file

        Load a train/test data file
        """
        query_string = [('filename', 'data/mnist_train_data.npy'),
                        ('datasetname', 'train_data'),
                        ('read_labels', false),
                        ('data_type', 'auto')]
        response = self.client.open(
            '/v2/load/loadFile',
            method='POST',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_reset_all_batch_indices(self):
        """Test case for reset_all_batch_indices

        resets all batch indices of all image sets
        """
        response = self.client.open(
            '/v2/load/resetAllBatchIndices',
            method='POST',
            content_type='application/json')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_reset_batch_index(self):
        """Test case for reset_batch_index

        resets the batch index of the image set
        """
        query_string = [('dataset_name', 'train_data'),
                        ('output', false)]
        response = self.client.open(
            '/v2/load/resetBatchIndex',
            method='POST',
            content_type='application/json',
            query_string=query_string)
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))

    def test_upload_file(self):
        """Test case for upload_file

        uploads a data file
        """
        data = dict(upfile=(BytesIO(b'some file data'), 'file.txt'))
        response = self.client.open(
            '/v2/load/uploadFile',
            method='POST',
            data=data,
            content_type='multipart/form-data')
        self.assert200(response,
                       'Response body is : ' + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
