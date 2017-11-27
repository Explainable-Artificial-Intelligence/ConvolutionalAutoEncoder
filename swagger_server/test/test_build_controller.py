# coding: utf-8

from __future__ import absolute_import

from swagger_server.models.parameter_set import ParameterSet
from . import BaseTestCase
from six import BytesIO
from flask import json


class TestBuildController(BaseTestCase):
    """ BuildController integration test stubs """

    def test_pass_ann_parameters(self):
        """
        Test case for pass_ann_parameters

        passes all learning and ANN parameters to the server
        """
        inputParameters = ParameterSet()
        response = self.client.open('/v2/build',
                                    method='POST',
                                    data=json.dumps(inputParameters),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
