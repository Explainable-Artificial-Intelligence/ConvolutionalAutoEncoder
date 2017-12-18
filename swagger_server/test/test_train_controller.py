# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.current_train_images import CurrentTrainImages
from swagger_server.models.current_train_status import CurrentTrainStatus
from swagger_server.models.train_status import TrainStatus
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestTrainController(BaseTestCase):
    """ TrainController integration test stubs """

    def test_control_training(self):
        """
        Test case for control_training

        starts, pauses and stops the training
        """
        trainStatus = TrainStatus()
        response = self.client.open('/v2/train/control',
                                    method='PUT',
                                    data=json.dumps(trainStatus),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_current_ann_images(self):
        """
        Test case for get_current_ann_images

        returns a subset of the current train images and the corresponding latent representation and output
        """
        response = self.client.open('/v2/train/currentANNImages/{setSize}'.format(setSize=56),
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_get_current_train_status(self):
        """
        Test case for get_current_train_status

        returns the next batch of scalar train variables
        """
        response = self.client.open('/v2/train/currentTrainStatus',
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
