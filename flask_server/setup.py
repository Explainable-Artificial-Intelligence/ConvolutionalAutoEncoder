# coding: utf-8

import sys
from setuptools import setup, find_packages

NAME = "swagger_server"
VERSION = "1.0.0"

# To install the library, run the following
#
# python setup.py install
#
# prerequisite: setuptools
# http://pypi.python.org/pypi/setuptools

REQUIRES = ["connexion"]

setup(
    name=NAME,
    version=VERSION,
    description="Convolutional Autoencoder",
    author_email="leon.schuetz@student.uni-tuebingen.de",
    url="",
    keywords=["Swagger", "Convolutional Autoencoder"],
    install_requires=REQUIRES,
    packages=find_packages(),
    package_data={'': ['swagger/swagger.yaml']},
    include_package_data=True,
    long_description="""\
    WebUI to build, train and tune a Convolutional Autoencoder
    """
)

