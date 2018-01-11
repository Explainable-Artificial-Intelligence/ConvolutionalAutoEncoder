# coding: utf-8

from __future__ import absolute_import

from flask import json
from swagger_server.models.cluster_parameters import ClusterParameters
from swagger_server.models.point2_d import Point2D

from . import BaseTestCase


class TestVisualizeController(BaseTestCase):
    """ VisualizeController integration test stubs """

    def test_generate_image_from_single_point(self):
        """
        Test case for generate_image_from_single_point

        generates the AE output from a given point of the sample distribution
        """
        point_2D = Point2D()
        response = self.client.open('/v2/visualize/generateImageFromSinglePoint',
                                    method='GET',
                                    data=json.dumps(point_2D),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_hidden_layer_latent_clustering(self):
        """
        Test case for get_hidden_layer_latent_clustering

        returns the clustering of the latent representation of a hidden layer
        """
        cluster_parameters = ClusterParameters()
        query_string = [('algorithm', 'algorithm_example'),
                        ('dataset_name', 'train_data'),
                        ('dimension_reduction', 'dimension_reduction_example'),
                        ('layer', 56)]
        response = self.client.open('/v2/visualize/getHiddenLayerLatentClustering',
                                    method='GET',
                                    data=json.dumps(cluster_parameters),
                                    content_type='application/json',
                                    query_string=query_string)
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
