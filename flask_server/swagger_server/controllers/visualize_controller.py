import os
import threading
import zipfile

import connexion
from werkzeug.datastructures import FileStorage

from flask_server.swagger_server.models.cluster_parameters import ClusterParameters
from flask_server.swagger_server.models.clustering import Clustering
from flask_server.swagger_server.models.point2_d import Point2D
from flask_server.utils.Clustering import perform_clustering
from flask_server.utils.Storage import Storage


# from connexion.decorators.decorator import ResponseContainer


def compute_hidden_layer_latent_clustering(algorithm, dimension_reduction, dataset_name='train_data', layer=0,
                                           cluster_parameters=None):  # noqa: E501
    """starts the clustering of the latent representation of a hidden layer

    starts the clustering of the latent representation of a hidden layer # noqa: E501

    :param algorithm: determines the clutering algorithm
    :type algorithm: str
    :param dimension_reduction: determines the algorithm for dim reduction
    :type dimension_reduction: str
    :param dataset_name: determines the dataset which should be clustered
    :type dataset_name: str
    :param layer: determines the hidden layer
    :type layer: int
    :param cluster_parameters: determines the clutering parameters
    :type cluster_parameters: dict | bytes

    :rtype: None
    """
    if connexion.request.is_json:
        cluster_parameters = ClusterParameters.from_dict(connexion.request.get_json())

        # define background thread:
        clustering_thread = threading.Thread(target=perform_clustering,
                                             args=(
                                                 algorithm, cluster_parameters, dataset_name, dimension_reduction,
                                                 layer,))

        Storage.set_cae_thread(clustering_thread)
        # start clustering:
        clustering_thread.start()

        return "clustering started", 200

    return 'parsing Error!', 415


def generate_image_from_single_point(point_2D):
    """
    generates the AE output from a given point of the sample distribution
    
    :param point_2D: 2D Point of the sample distribution
    :type point_2D: dict | bytes

    :rtype: Image
    """
    if connexion.request.is_json:
        point_2D = Point2D.from_dict(connexion.request.get_json())

    return 'do some magic!'


def get_hidden_layer_latent_clustering(dataset_name='train_data', layer=0):
    """returns the clustering of the latent representation of a hidden layer

    returns the clustering of the latent representation of a hidden layer # noqa: E501

    :param dataset_name: determines the dataset which should be clustered
    :type dataset_name: str
    :param layer: determines the hidden layer
    :type layer: int

    :rtype: Clustering
    """

    if (dataset_name, layer) not in Storage.clustering_status.keys():
        return "clustering not found", 404

    if Storage.clustering_status[(dataset_name, layer)].startswith('running'):
        return "clustering still running", 102

    if Storage.clustering_status[(dataset_name, layer)] == "finished":
        return Storage.clustering_data[(dataset_name, layer)], 200


def get_pretrained_model_as_zip():  # noqa: E501
    """returns a zip file with the pre trained model as runable python script

     # noqa: E501


    :rtype: file
    """

    # get save path:
    save_path = Storage.parameter_set.session_saver_path

    # get file list:
    file_list = []

    print("HI")

    # add python script files:
    file_list.append("./utils/ConvolutionalAutoEncoder.py")
    file_list.append("./utils/FileParser.py")
    file_list.append("./utils/CAE_predictor.py")

    # add checkpoint file:
    file_list.append(os.path.join(save_path, "checkpoint"))
    file_list.append(os.path.join(save_path, "parameter_set.pkl"))

    # add latest checkpoint:
    with open(os.path.join(save_path, "checkpoint")) as checkpoint_file:
        latest_checkpoint_name = checkpoint_file.readlines()[0].split(':')[1].strip()[1:-1]

        # get all related files:
        file_list += [os.path.join(save_path, f) for f in os.listdir(save_path) if f.startswith(latest_checkpoint_name)]

    # create zip file:
    # output = io.StringIO()
    zip_file = zipfile.ZipFile(os.path.join(save_path, "download.zip"), "w")
    # zip_file = zipfile.ZipFile(output, "w")
    # zip_file = zipstream.ZipFile(mode='w', compression=zipstream.ZIP_DEFLATED)
    # append files:
    for file in file_list:
        zip_file.write(file, os.path.basename(file))
    zip_file.close()

    print(file_list)

    # with open(os.path.join(save_path, "download.zip"), "rb") as file:
    #     byte_string = file.read()

    with open(os.path.join(save_path, "download.zip"), 'rb') as fp:
        test_zip = FileStorage(fp)

    in_file = open(os.path.join(save_path, "download.zip"), "rb")  # opening for [r]eading as [b]inary
    data = in_file.read()  # if you only wanted to read 512 bytes, do .read(512)
    in_file.close()

    test = file
    return test, 200

# return send_file(os.path.join(os.path.abspath(save_path), "download.zip"), attachment_filename='sample.zip', as_attachment=True)

# resp = Response(zip_file, mimetype="text/zip")
# resp.headers["Accept"] = "text/zip"
# resp.headers['Access-Control-Allow-Origin'] = '*'
# resp.headers["Content-Disposition"] = "attachment; filename=download.zip"
# return resp

# resp = io.send_from_directory('uploads', 'test.bin',
#                                      as_attachment=True,
#                                      mimetype='application/octet-stream',
#                                      attachment_filename='test_rsp.bin'
#                                      )
# return resp
#
# #return connexion.send_from_directory(os.path.abspath(save_path), "download.zip", as_attachment=True), 200

# resp = send_from_directory(save_path, 'download.zip',
#                            as_attachment=True,
#                            mimetype='application/octet-stream',
#                            attachment_filename='download.zip'
#                            )
#
# return ResponseContainer(
#     mimetype=resp.mimetype,
#     data=resp.response,
#     status_code=200,
#     headers=resp.headers
# )
