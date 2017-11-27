# coding: utf-8

from __future__ import absolute_import

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
        response = self.client.open('/v2/train',
                                    method='PUT',
                                    data=json.dumps(trainStatus),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
