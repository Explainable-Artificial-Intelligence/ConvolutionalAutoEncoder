#!/usr/bin/env python3

import connexion

from utils.FileParser import download_test_data
from .encoder import JSONEncoder


if __name__ == '__main__':
    download_test_data()
    app = connexion.App(__name__, specification_dir='./swagger/')
    app.app.json_encoder = JSONEncoder
    app.add_api('swagger.yaml', arguments={'title': 'WebUI to build, train and tune a Convolutional Autoencoder'})
    app.run(port=8080)
