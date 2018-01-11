# coding: utf-8

from __future__ import absolute_import

from flask import json
from swagger_server.models.parameter_list import ParameterList

from . import BaseTestCase


class TestBuildController(BaseTestCase):
    """ BuildController integration test stubs """

    def test_build_ann(self):
        """
        Test case for build_ann

        passes all learning and ANN parameters to the server
        """
        inputParameters = ParameterList()
        response = self.client.open('/v2/build/buildANN',
                                    method='POST',
                                    data=json.dumps(inputParameters),
                                    content_type='application/json')
        self.assert200(response, "Response body is : " + response.data.decode('utf-8'))


if __name__ == '__main__':
    import unittest
    unittest.main()
