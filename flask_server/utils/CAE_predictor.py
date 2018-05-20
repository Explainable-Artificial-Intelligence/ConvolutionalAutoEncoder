"""
Wrapper class to run pretrained CAE models

"""
import argparse
import os

import numpy as np
from ConvolutionalAutoEncoder import SklearnCAE
from FileParser import load_object, load_input_data
from PIL import Image


def parse_arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("task", type=str, default="score",
                        help="task which should be executed (score, predict, train)")
    parser.add_argument("-p", "--ann_parameters", type=str, default="parameter_set.pkl",
                        help="file path to the dict of the ann parameter of the trained model")
    parser.add_argument("-m", "--trained_model", type=str, default="./",
                        help="file path to the checkpoint file of the trained model")
    parser.add_argument("-o", "--output_type", type=str, default="npy",
                        help="data type of the predicted data")
    parser.add_argument("-f", "--output_file_path", type=str, default="./output",
                        help="output file path/name for the predicted data")
    parser.add_argument("-i", "--input_type", type=str, default="auto",
                        help="data type of the input data")
    parser.add_argument("-g", "--input_file_path", type=str, default="./input/",
                        help="input file path/name for the train/prediction data")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="activates the verbose console output")

    args = parser.parse_args()

    return args


def main():
    args = parse_arguments()
    parameters = load_object(args.ann_parameters)

    # modify some parameters:
    parameters['verbose'] = args.verbose
    parameters['session_saver_path'] = args.trained_model
    parameters['load_prev_session'] = True

    # create tensorflow model
    cae = SklearnCAE(**parameters)
    print("model loaded")

    # perform task:

    # load input data
    input_data = load_input_data(args.input_file_path, args.input_type)[2]
    if args.task == "score":
        # score data:
        scores = cae.score(input_data)
        print("dataset score : %f" % sum(scores))

        # save scores
        save_output(args, scores, True)
    elif args.task == "predict":
        # predict data:
        prediction = cae.predict(input_data)

        # save prediction
        save_output(args, prediction, False)
    else:
        print("ERROR: Invalid task: %s" % args.output_type)
        print("\t allowed tasks: score, train, predict")


def save_output(args, array, scores):
    # get filename:
    path, filename = os.path.split(args.output_file_path)
    if filename == "":
        # if folder is given, use std. filename
        if scores:
            filename = "scores." + args.output_type
        else:
            filename = "prediction." + args.output_type
    # check if file/folder exists:
    if not os.path.exists(path):
        os.makedirs(path)
    file_path = os.path.join(path, filename)
    if args.output_type == "npy":
        # save array as numpy bin format:
        np.save(file_path, array)
        print("File successfully saved to %s" % file_path)
    elif args.output_type == "csv":
        # saves scores as csv:
        np.savetxt(file_path, array, delimiter=",")
        print("File successfully saved to %s" % file_path)
    elif args.output_type == "png" and not scores:
        # save prediction as png images
        i = 1
        for image_array in array:
            image_array = 255 * image_array.reshape([28, 28])
            img = Image.fromarray(image_array.astype(np.uint8), mode='L')
            # with open(os.path.join(output_path_train, "train_image_%05d.png" % i), 'w') as image_file:
            img.save(os.path.join(args.output_file_path, "predicted_image_%05d.png" % i), format='PNG')
            print(os.path.join(args.output_file_path, "predicted_image_%05d.png" % i) + " ...saved")
            i += 1
    else:
        print("ERROR: Invalid file data type: %s" % args.output_type)


if __name__ == "__main__":
    main()
