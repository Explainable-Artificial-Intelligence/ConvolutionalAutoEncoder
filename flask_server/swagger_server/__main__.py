#!/usr/bin/env python3

import connexion
from flask_cors import CORS

from flask_server.swagger_server import encoder
from flask_server.utils.FileParser import download_test_data


def main():
    app = connexion.App(__name__, specification_dir='./swagger/')
    app.app.json_encoder = encoder.JSONEncoder
    app.add_api('swagger.yaml', arguments={'title': 'Convolutional Autoencoder'})

    # add CORS support
    CORS(app.app)

    app.run(port=8080)


if __name__ == '__main__':
    download_test_data()
    main()
