# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.parameter_lists import ParameterLists
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
        response = self.client.open('/v2/tune/control',
                                    method='PUT',
                                    data=json.dumps(trainStatus),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))

    def test_pass_ann_parameter_lists(self):
        """
        Test case for pass_ann_parameter_lists

        passes all learning and ANN parameters to the server
        """
        inputParameterLists = ParameterLists()
        response = self.client.open('/v2/tune',
                                    method='POST',
                                    data=json.dumps(inputParameterLists),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
