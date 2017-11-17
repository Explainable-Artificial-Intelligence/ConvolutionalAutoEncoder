import tensorflow as tf
import math
import pickle
import itertools
import numpy as np
import os
from sklearn import metrics
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt


class SklearnCAE(BaseEstimator, TransformerMixin):
    """Convolutional Auto Encoder as sklearn class"""
    _activation_functions = {
        "relu": tf.nn.relu,
        "relu6": tf.nn.relu6,
        #"crelu": tf.nn.crelu, #throws error
        "elu": tf.nn.elu,
        "softplus": tf.nn.softplus,
        "softsign": tf.nn.softsign,
        "sigmoid": tf.sigmoid,
        "tanh": tf.tanh
    }

    _decaying_learning_rate = {
        "static": None,
        "exponential_decay": tf.train.exponential_decay,
        "inverse_time_decay": tf.train.inverse_time_decay,
        "natural_exp_decay": tf.train.natural_exp_decay,
        "piecewise_constant": tf.train.piecewise_constant,
        "polynomial_decay": tf.train.polynomial_decay
    }

    _optimizers = {
        "GradientDescentOptimizer": tf.train.GradientDescentOptimizer,
        "AdadeltaOptimizer": tf.train.AdadeltaOptimizer,
        "AdagradOptimizer": tf.train.AdagradOptimizer,
        "AdagradDAOptimizer": tf.train.AdagradDAOptimizer,
        "MomentumOptimizer": tf.train.MomentumOptimizer,
        "AdamOptimizer": tf.train.AdamOptimizer,
        "FtrlOptimizer": tf.train.FtrlOptimizer,
        "ProximalGradientDescentOptimizer": tf.train.ProximalGradientDescentOptimizer,
        "ProximalAdagradOptimizer": tf.train.ProximalAdagradOptimizer,
        "RMSPropOptimizer": tf.train.RMSPropOptimizer
    }

    def __init__(self, input_shape, number_of_stacks, filter_sizes, mirror_weights=False, activation_function="relu",
                 batch_size=100, n_epochs=50, use_tensorboard=True, silent=False, learning_rate_function="static",
                 lr_learning_rate=0.01, lr_decay_steps=1000, lr_decay_rate=0.9, lr_staircase=False,
                 lr_boundaries=[10000, 20000], lr_values=[1.0, 0.5, 0.1], lr_end_learning_rate=0.0001, lr_power=1.0,
                 lr_cycle=False, optimizer="AdamOptimizer", momentum=0.9):
        """
        Called when initializing the transformer

        :param input_shape:
        :param number_of_stacks:
        :param filter_sizes:
        :param mirror_weights:
        :param activation_function:
        :param batch_size:
        :param n_epochs:
        :param use_tensorboard:
        :param learning_rate_functions:
        :param lr_learning_rate:
        :param lr_decay_steps:
        :param lr_decay_rate:
        :param lr_staircase:
        :param lr_boundaries:
        :param lr_values:
        :param lr_end_learning_rate:
        :param lr_power:
        :param lr_cycle:
        :param optimizer:
        :param momentum:
        """
        # parse ANN topology parameters
        self.input_shape = input_shape
        self.number_of_stacks = number_of_stacks
        self.filter_sizes = filter_sizes
        self.mirror_weights = mirror_weights

        # set activation function
        if activation_function in self._activation_functions.keys():
            self.activation_function = self._activation_functions[activation_function]
        else:
            raise RuntimeError("Please define a valid activation function. \nValid activation functions are:\n",
                               self._activation_functions.keys())

        # parse learning rate parameters

        if learning_rate_function in self._decaying_learning_rate.keys():
            self.learning_rate_function = learning_rate_function
            self.lr_learning_rate = lr_learning_rate
            self.lr_decay_steps = lr_decay_steps
            self.lr_decay_rate = lr_decay_rate
            self.lr_staircase = lr_staircase
            self.lr_boundaries = lr_boundaries
            self.lr_values = lr_values
            self.lr_end_learning_rate = lr_end_learning_rate
            self.lr_power = lr_power
            self.lr_cycle = lr_cycle
        else:
            raise RuntimeError("Please define a valid learning rate function. \nValid learning rate functions are:\n",
                               self._decaying_learning_rate.keys())

        # parse optimizer
        if optimizer in self._optimizers.keys():
            self.optimizer = self._optimizers[optimizer]
        else:
            raise RuntimeError("Please define a valid optimizer. \nValid optimizer are:\n",
                               self._optimizers.keys())
        self.momentum = momentum

        # parse train parameters
        self.batch_size = batch_size
        self.n_epochs = n_epochs
        self.use_tensorboard = use_tensorboard

        # define console output
        self.silent = silent

        # Mark model as untrained
        self.model_is_trained = False

        # build ANN
        self._build_network_topology()

        # define cost function
        self._define_cost_function()

        # define learning rate function
        self._define_learning_rate_function()

        # define optimizer
        self._define_optimizer()

        # create tensorflow session
        self.tf_session = tf.Session()
        self.tf_session.run(tf.global_variables_initializer())

        # initialize Tensorboard
        if self.use_tensorboard:
            self._define_summary_variables()
            self._init_tensorboard_file_writer()

    def _build_network_topology(self):
        """
        Builds the ANN topology for a convolutional autoencoder
        """
        # create placeholder for input images
        self.input_images = tf.placeholder(tf.float32, self.input_shape)

        # define model topology
        # encoder part
        self._build_encoder()

        # decoder part
        self._build_decoder()

    def _build_encoder(self):
        """

        """
        # construct the encoder
        self.encoder_weights = []
        self.encoder_biases = []
        self.encoder_shapes = []
        self.layers = []
        current_input = self.input_images
        self.layers.append(self.input_images)
        # iterate over all encoder layer
        for layer_i, n_output in enumerate(self.number_of_stacks[1:]):
            output = self._build_encoder_layer(current_input, layer_i, n_output)
            self.layers.append(output)
            current_input = output

        # save latent representation
        self.latent_representation = output

    def _build_encoder_layer(self, current_input, layer_i, n_output):
        """

        :param current_input:
        :param layer_i:
        :param n_output:
        :return:
        """
        number_of_input_layers = current_input.get_shape().as_list()[3]
        self.encoder_shapes.append(current_input.get_shape().as_list())
        weights_of_layer_i = self._create_random_layer_weights(layer_i, n_output, number_of_input_layers)
        bias_of_layer_i = self._create_layer_biases(n_output)
        self.encoder_weights.append(weights_of_layer_i)
        self.encoder_biases.append(bias_of_layer_i)
        output = self.activation_function(
            tf.nn.conv2d(current_input, weights_of_layer_i, strides=[1, 2, 2, 1], padding='SAME') +
            bias_of_layer_i)
        return output

    def _create_random_layer_weights(self, layer_i, n_output, number_of_input_layers):
        """

        :param layer_i:
        :param n_output:
        :param number_of_input_layers:
        :return:
        """
        weights = tf.Variable(
            tf.random_uniform(
                [self.filter_sizes[layer_i], self.filter_sizes[layer_i], number_of_input_layers, n_output],
                -1.0 / math.sqrt(number_of_input_layers), 1.0 / math.sqrt(number_of_input_layers)))
        return weights

    def _create_layer_biases(self, n_output):
        """

        :param n_output:
        :return:
        """
        return tf.Variable(tf.zeros([n_output]))

    def _build_decoder(self):
        """
        """
        # construct the decoder
        self.decoder_weights = []
        self.decoder_biases = []
        self.decoder_shapes = self.encoder_shapes.reverse()

        current_input = self.latent_representation

        # iterate over all encoder layer
        for layer_i, shape in enumerate(self.encoder_shapes):
            output = self._build_decoder_layer(current_input, layer_i, shape)
            self.layers.append(output)
            current_input = output

        self.output_images = output

    def _build_decoder_layer(self, current_input, layer_i, shape):
        """

        :param current_input:
        :param layer_i:
        :param shape:
        :return:
        """
        # reuse weights and biases
        reversed_encoder_biases = list(reversed(self.encoder_biases))
        reversed_encoder_weights = list(reversed(self.encoder_weights))
        reversed_number_of_stacks = list(reversed(self.number_of_stacks))

        if self.mirror_weights:
            weights_of_layer_i = reversed_encoder_weights[layer_i]
        else:
            weights_of_layer_i = self._create_random_layer_weights(layer_i, reversed_number_of_stacks[layer_i],
                                                                   reversed_encoder_weights[
                                                                       layer_i].get_shape().as_list()[2])
        # if self.mirror_biases:
        #    biases_of_layer_i = reversed_encoder_biases[layer_i + 1]
        # else:
        biases_of_layer_i = self._create_layer_biases(weights_of_layer_i.get_shape().as_list()[2])

        self.decoder_weights.append(weights_of_layer_i)
        self.decoder_biases.append(biases_of_layer_i)
        output = self.activation_function(tf.nn.conv2d_transpose(current_input, weights_of_layer_i,
                                                                 tf.stack(
                                                                     [tf.shape(self.input_images)[0], shape[1],
                                                                      shape[2], shape[3]]),
                                                                 strides=[1, 2, 2, 1],
                                                                 padding='SAME') + biases_of_layer_i)
        return output

    def _define_cost_function(self):
        """

        :return:
        """
        self.cost_function = tf.reduce_sum(tf.square(self.output_images - self.input_images))

    def _define_learning_rate_function(self):
        """

        :return:
        """
        # set an global counter for the training iteration
        self.global_step = tf.Variable(0, trainable=False, dtype=tf.int64)

        # static learning rate:
        if self.learning_rate_function == "static":
            self.learning_rate = self.lr_learning_rate
            return

        # piecewise constant learning rate
        if self.learning_rate_function == "piecewise_constant":
            self.learning_rate = tf.train.piecewise_constant(self.global_step, self.lr_boundaries, self.lr_values)
            return

        # polynomially decaying learning rate
        if self.learning_rate_function == "polynomial_decay":
            self.learning_rate = tf.train.polynomial_decay(self.lr_learning_rate, self.global_step, self.lr_decay_steps,
                                                           self.lr_end_learning_rate, self.lr_power, self.lr_cycle)
            return

        # exponentially decaying learning rate
        self.learning_rate = self._decaying_learning_rate[self.learning_rate_function](self.lr_learning_rate,
                                                                                       self.global_step,
                                                                                       self.lr_decay_steps,
                                                                                       self.lr_decay_rate,
                                                                                       self.lr_staircase)

    def _define_optimizer(self):
        """

        :return:
        """
        # special cases:
        # AdagradDAOptimizer:
        if self.optimizer == tf.train.AdagradDAOptimizer:
            self.final_optimizer = self.optimizer(self.learning_rate, self.global_step).minimize(
                self.cost_function, self.global_step)
            return
        # MomentumOptimizer:
        if self.optimizer == tf.train.MomentumOptimizer:
            self.final_optimizer = self.optimizer(self.learning_rate, self.momentum).minimize(
                self.cost_function, self.global_step)
            return

        # optimizer with std. parameters
        self.final_optimizer = self.optimizer(self.learning_rate).minimize(
            self.cost_function, self.global_step)

    def _define_summary_variables(self):
        """

        :return:
        """
        # visualisation:
        tf.summary.image("input_images", self.input_images)
        tf.summary.image("output_images", self.output_images)
        tf.summary.image("differences", self.output_images - self.input_images)
        tf.summary.scalar("cost", self.cost_function)
        tf.summary.histogram("latent_representation", self.latent_representation)
        tf.summary.scalar("learning_rate", self.learning_rate)
        tf.summary.scalar("mean_cost", self.cost_function / self.batch_size)
        # tf.summary.histogram("weights", weights)

        self.merged_summary = tf.summary.merge_all()

    def _init_tensorboard_file_writer(self):
        """

        :return:
        """
        self.test_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'test'), self.tf_session.graph)
        self.train_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'train'), self.tf_session.graph)

    def fit(self, train_data):
        """

        """
        # save
        self.train_data = train_data

        # train
        self._train_model()

        return self

    def _train_model(self):
        """

        """
        # Fit all training data
        for epoch_i in range(self.n_epochs):
            self._train_model_single_epoch(epoch_i)

        # mark model as trained:
        self.model_is_trained = True

    def _train_model_single_epoch(self, epoch_i):
        """

        :param epoch_i:
        :return:
        """
        for batch_index in range(len(self.train_data) // self.batch_size):
            self._train_model_single_batch(batch_index, epoch_i)

    def _train_model_single_batch(self, batch_index, epoch_i):
        """

        :param batch_index:
        :param epoch_i:
        :return:
        """
        current_batch = self.train_data[batch_index * self.batch_size:(batch_index + 1) * self.batch_size]
        # Tensorboard summary:
        if self.use_tensorboard:
            summary, train_cost, _, step = self.tf_session.run(
                [self.merged_summary, self.cost_function, self.final_optimizer, self.global_step],
                feed_dict={self.input_images: current_batch})
            self.train_writer.add_summary(summary, step)
        else:
            train_cost, _, step = self.tf_session.run(
                [self.cost_function, self.final_optimizer, self.global_step],
                feed_dict={self.input_images: current_batch})
        if not self.silent:
            print(str(step) + ": " + str(train_cost))

    def get_latent_representation(session, ANN_topology, X_variable, data, latent_variable):
        """

        :param ANN_topology:
        :param X_variable:
        :param data:
        :param latent_variable:
        :return:
        """
        return session.run(ANN_topology[latent_variable], feed_dict={ANN_topology[X_variable]: data})

    def predict(self, X, y=None):
        """

        :param X:
        :param y:
        :return:
        """
        if self.model_is_trained:
            return self.tf_session.run(self.output_images, feed_dict={self.input_images: X})
        else:
            raise RuntimeError("You must train transformer before predicting data!")

    def score(self, X, y=None):
        """

        :param X:
        :param y:
        :return:
        """
        if self.model_is_trained:
            return self.tf_session.run(self.cost_function, feed_dict={self.input_images: X})
        else:
            raise RuntimeError("You must train transformer before scoring data!")
