# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.input_data import InputData
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestInputController(BaseTestCase):
    """ InputController integration test stubs """

    def test_load_train_data(self):
        """
        Test case for load_train_data

        Load a train data file
        """
        response = self.client.open('/v2/input/{filename}'.format(filename='filename_example'),
                                    method='GET',
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
