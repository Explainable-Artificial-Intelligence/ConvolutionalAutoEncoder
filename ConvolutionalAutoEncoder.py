import tensorflow as tf
import math
import pickle
import itertools
import numpy as np
import os
import sys
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
        # "crelu": tf.nn.crelu, #throws error
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
    _random_functions = {
        "zeros": tf.zeros,
        "gamma": tf.random_gamma,
        "normal": tf.random_normal,
        "poisson": tf.random_poisson,
        "uniform": tf.random_uniform
    }

    def __init__(self, input_shape, number_of_stacks, filter_sizes, mirror_weights=False, activation_function="relu",
                 batch_size=100, n_epochs=50, use_tensorboard=True, verbose=True, learning_rate_function="static",
                 lr_initial_learning_rate=0.01, lr_decay_steps=1000, lr_decay_rate=0.9, lr_staircase=False,
                 lr_boundaries=[10000, 20000], lr_values=[1.0, 0.5, 0.1], lr_end_learning_rate=0.0001, lr_power=1.0,
                 lr_cycle=False, optimizer='AdamOptimizer', momentum=0.9, random_function_for_weights="uniform",
                 rw_alpha=0.5, rw_beta=None, rw_mean=0.0, rw_stddev=1.0, rw_lam=0.5, rw_minval=-.5, rw_maxval=.5,
                 rw_seed=None, random_function_for_biases="zeros", rb_alpha=0.5, rb_beta=None, rb_mean=0.0,
                 rb_stddev=1.0, rb_lam=0.5, rb_minval=-.5, rb_maxval=.5, rb_seed=None, session_saver_path='./save/',
                 load_prev_session=False):
        """
        Calls when initializing the transformer

        :param input_shape:
        :param number_of_stacks:
        :param filter_sizes:
        :param mirror_weights:
        :param activation_function:
        :param batch_size:
        :param n_epochs:
        :param use_tensorboard:
        :param verbose:
        :param learning_rate_function:
        :param lr_initial_learning_rate:
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
        :param random_function_for_weights:
        :param rw_alpha:
        :param rw_beta:
        :param rw_mean:
        :param rw_stddev:
        :param rw_lam:
        :param rw_minval:
        :param rw_maxval:
        :param rw_seed:
        :param random_function_for_biases:
        :param rb_alpha:
        :param rb_beta:
        :param rb_mean:
        :param rb_stddev:
        :param rb_lam:
        :param rb_minval:
        :param rb_maxval:
        :param rb_seed:
        :param session_saver_path:
        """

        # reset currently active tf graph
        tf.reset_default_graph()

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
            self.lr_initial_learning_rate = lr_initial_learning_rate
            self.lr_decay_steps = lr_decay_steps
            self.lr_decay_rate = lr_decay_rate
            self.lr_staircase = lr_staircase
            # convert boun
            self.lr_boundaries = [tf.cast(value, dtype=tf.float64) for value in lr_boundaries]
            self.lr_values = [tf.cast(value, dtype=tf.float64) for value in lr_values]
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

        # parse random function for initial weights
        if random_function_for_weights in self._random_functions.keys():
            self.random_function_for_weights = random_function_for_weights
            # parse random function parameters
            self.rw_alpha = rw_alpha
            self.rw_beta = rw_beta
            self.rw_mean = rw_mean
            self.rw_stddev = rw_stddev
            self.rw_lam = rw_lam
            self.rw_minval = rw_minval
            self.rw_maxval = rw_maxval
            self.rw_seed = rw_seed
        else:
            raise RuntimeError("Please define a valid random function for the initial weights. \nValid values are:\n",
                               self._random_functions.keys())

        # parse random function for initial weights
        if random_function_for_biases in self._random_functions.keys():
            self.random_function_for_biases = random_function_for_biases
            # parse random function parameters
            self.rb_alpha = rb_alpha
            self.rb_beta = rb_beta
            self.rb_mean = rb_mean
            self.rb_stddev = rb_stddev
            self.rb_lam = rb_lam
            self.rb_minval = rb_minval
            self.rb_maxval = rb_maxval
            self.rb_seed = rb_seed
        else:
            raise RuntimeError(
                "Please define a valid random function for the initial biases. \nValid values are:\n",
                self._random_functions.keys())

        # parse train parameters
        self.batch_size = batch_size
        self.n_epochs = n_epochs
        self.use_tensorboard = use_tensorboard

        # define console output
        self.verbose = verbose

        # Mark model as untrained
        self.model_is_trained = False

        # set ANN status:
        self.ann_status = tf.Variable("initialized", name="ANN_Status", dtype=tf.string)
        self.trained_epochs = tf.Variable(0, dtype=tf.int32, name="trained_epochs")

        self._build_ann()

        # create tensorflow session
        self.tf_session = tf.Session()

        # initialize session saver:
        self.session_saver_path = session_saver_path
        self.load_prev_session = load_prev_session
        self.tf_session.run(tf.global_variables_initializer())
        if self.session_saver_path is not None:
            self.session_saver = tf.train.Saver()
            if self.load_prev_session:
                # load previous session:
                self._load_session()
                # Mark model as trained
                self.model_is_trained = True

        # initialize Tensorboard
        if self.use_tensorboard:
            self._define_summary_variables()
            self._init_tensorboard_file_writer()

    def _load_session(self):
        if self.session_saver_path is not None:
            self._build_ann()
            prev_session = tf.train.get_checkpoint_state(self.session_saver_path)
            self.tf_session = tf.Session()
            self.tf_session.run(tf.global_variables_initializer())
            self.session_saver.restore(self.tf_session, prev_session.model_checkpoint_path)
            if self.verbose:
                print("session restored!")

    def _build_ann(self):
        """

        """
        # build ANN
        self._build_network_topology()
        # define cost function
        self._define_cost_function()
        # define learning rate function
        self._define_learning_rate_function()
        # define optimizer
        self._define_optimizer()

    def _build_network_topology(self):
        """
        Builds the ANN topology for a convolutional autoencoder
        """
        # create placeholder for input images
        self.input_images = tf.placeholder(tf.float32, self.input_shape, name="Input_Images")

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
        for layer_i, n_output in enumerate(self.number_of_stacks):
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
        weights_of_layer_i = self._create_random_layer_weights(
            [self.filter_sizes[layer_i], self.filter_sizes[layer_i], number_of_input_layers, n_output],
            "encoder_weights_layer_" + str(layer_i))
        print([self.filter_sizes[layer_i], self.filter_sizes[layer_i], number_of_input_layers, n_output])
        bias_of_layer_i = self._create_layer_biases([n_output], "encoder_biases_layer_" + str(layer_i))
        self.encoder_weights.append(weights_of_layer_i)
        self.encoder_biases.append(bias_of_layer_i)
        # TODO: understand strides /padding
        output = self.activation_function(
            tf.nn.conv2d(current_input, weights_of_layer_i, strides=[1, 2, 2, 1], padding='SAME') +
            bias_of_layer_i)
        return output

    def _create_random_layer_weights(self, shape, name=""):
        """

        :param names:
        :param shape:
        :return:
        """
        if self.random_function_for_weights == "zeros":
            return tf.Variable(tf.zeros(shape), name=name)
        if self.random_function_for_weights == "gamma":
            return tf.Variable(tf.random_gamma(shape, self.rw_alpha, self.rw_beta, seed=self.rw_seed), name=name)
        if self.random_function_for_weights == "normal":
            return tf.Variable(tf.random_normal(shape, self.rw_mean, self.rw_stddev, seed=self.rw_seed), name=name)
        if self.random_function_for_weights == "poisson":
            return tf.Variable(tf.random_poisson(self.rw_lam, shape, seed=self.rw_seed), name=name)
        else:
            return tf.Variable(tf.random_uniform(shape, self.rw_minval, self.rw_maxval, seed=self.rw_seed), name=name)

    def _create_layer_biases(self, shape, name=""):
        """

        :param n_output:
        :return:
        """
        if self.random_function_for_biases == "zeros":
            return tf.Variable(tf.zeros(shape), name=name)
        if self.random_function_for_biases == "gamma":
            return tf.Variable(tf.random_gamma(shape, self.rw_alpha, self.rw_beta, seed=self.rw_seed), name=name)
        if self.random_function_for_biases == "normal":
            return tf.Variable(tf.random_normal(shape, self.rw_mean, self.rw_stddev, seed=self.rw_seed), name=name)
        if self.random_function_for_biases == "poisson":
            return tf.Variable(tf.random_poisson(self.rw_lam, shape, seed=self.rw_seed), name=name)
        else:
            return tf.Variable(tf.random_uniform(shape, self.rw_minval, self.rw_maxval, seed=self.rw_seed), name=name)

    def _build_decoder(self):
        """
        Builds the decoder of the Convolutional Autoencoder
        """
        # construct the decoder
        self.decoder_weights = []
        self.decoder_biases = []
        self.decoder_shapes = list(reversed(self.encoder_shapes))

        current_input = self.latent_representation

        # iterate over all encoder layer
        for layer_i, shape in enumerate(self.decoder_shapes):
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
        reversed_encoder_weights = list(reversed(self.encoder_weights))

        print(reversed_encoder_weights[layer_i].get_shape().as_list())
        if self.mirror_weights:
            weights_of_layer_i = reversed_encoder_weights[layer_i]
        else:
            weights_of_layer_i = self._create_random_layer_weights(
                reversed_encoder_weights[layer_i].get_shape().as_list(), "decoder_weights_layer_" + str(layer_i))

        biases_of_layer_i = self._create_layer_biases(weights_of_layer_i.get_shape().as_list()[2],
                                                      "decoder_biases_layer_" + str(layer_i))

        self.decoder_weights.append(weights_of_layer_i)
        self.decoder_biases.append(biases_of_layer_i)
        # TODO: add names
        # print([current_input.shape, weights_of_layer_i.shape, tf.stack([tf.shape(self.input_images)[0], shape[1], shape[2], shape[3]])])
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
        # TODO: allow predefined cost functions
        self.cost_function = tf.reduce_sum(tf.square(self.output_images - self.input_images))

    def _define_learning_rate_function(self):
        """

        :return:
        """
        # set an global counter for the training iteration
        self.global_step = tf.Variable(0, trainable=False, dtype=tf.int64, name="global_step")

        # static learning rate:
        if self.learning_rate_function == "static":
            self.learning_rate = self.lr_initial_learning_rate
            return

        # piecewise constant learning rate
        if self.learning_rate_function == "piecewise_constant":
            self.learning_rate = tf.train.piecewise_constant(tf.cast(self.global_step, dtype=tf.float64),
                                                             self.lr_boundaries, self.lr_values)
            return

        # polynomially decaying learning rate
        if self.learning_rate_function == "polynomial_decay":
            self.learning_rate = tf.train.polynomial_decay(self.lr_initial_learning_rate, self.global_step,
                                                           self.lr_decay_steps,
                                                           self.lr_end_learning_rate, self.lr_power, self.lr_cycle)
            return

        # exponentially decaying learning rate
        self.learning_rate = self._decaying_learning_rate[self.learning_rate_function](self.lr_initial_learning_rate,
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

        # train
        self._train_model(train_data)

        return self

    def _train_model(self, train_data):
        """

        """
        # reopen a previous training:
        if self.model_is_trained:
            self._load_session()
        # set ANN status
        self.tf_session.run(self.ann_status.assign("training"))

        # Fit all training data
        start_epoch = self.trained_epochs.eval(self.tf_session)
        for epoch_i in range(start_epoch, self.n_epochs):
            self._train_model_single_epoch(epoch_i, train_data)
            # save session  after each epoch
            # TODO: modifiable num epochs
            if self.session_saver_path is not None and epoch_i % 5 == 0:
                self.session_saver.save(self.tf_session, os.path.join(self.session_saver_path, 'tf_session.bak'),
                                        global_step=self.global_step)
                print("model saved to %s" % str(os.path.join(self.session_saver_path, 'tf_session.bak')))
            print(self.ann_status.eval(self.tf_session))
            if not self.ann_status.eval(self.tf_session) == b'training':
                break
            # set number of trained epochs:
            self.tf_session.run(self.trained_epochs.assign_add(1))

        # mark model as trained:
        self.model_is_trained = True

        # set new ann status:


        if self.tf_session.run(self.trained_epochs) == self.n_epochs:
            self.tf_session.run(self.ann_status.assign("completely trained"))
        else:
            self.tf_session.run(self.ann_status.assign("partly trained"))
            print("%i of %i epochs trained" % (self.tf_session.run(self.trained_epochs), self.n_epochs))
            # close session
            # self.tf_session.close()

        # save final train status
        if self.session_saver_path is not None:
            self.session_saver.save(self.tf_session, os.path.join(self.session_saver_path, 'tf_session.bak'),
                                    global_step=self.global_step)
            print("final model saved to %s" % str(os.path.join(self.session_saver_path, 'tf_session.bak')))
            self._close_session()

    def _train_model_single_epoch(self, epoch_i, train_data):
        """

        :param epoch_i:
        :return:
        """
        for batch_index in range(len(train_data) // self.batch_size):
            # check if training is aborted:
            if not self.ann_status.eval(self.tf_session) == b'training':
                return
            current_batch = train_data[batch_index * self.batch_size:(batch_index + 1) * self.batch_size]
            self._train_model_single_batch(current_batch)

    def _train_model_single_batch(self, current_batch):
        """

        :param batch_index:
        :param epoch_i:
        :return:
        """
        # check if training is aborted:
        if not self.ann_status.eval(self.tf_session) == b'training':
            return
        if self.use_tensorboard:
            summary, train_cost, _, step = self.tf_session.run(
                [self.merged_summary, self.cost_function, self.final_optimizer, self.global_step],
                feed_dict={self.input_images: current_batch})
            # TODO:replace feed_dict?
            self.train_writer.add_summary(summary, step)
        else:
            train_cost, _, step = self.tf_session.run(
                [self.cost_function, self.final_optimizer, self.global_step],
                feed_dict={self.input_images: current_batch})
        if self.verbose:
            print(str(step) + ": " + str(train_cost))

    def update_ann_status(self, status):
        """

        :return:
        """
        if status == "stop":
            self.tf_session.run(self.ann_status.assign("stop", use_locking=True))

    def get_latent_representation(self, input_data):
        """

        :param ANN_topology:
        :param X_variable:
        :param data:
        :param latent_variable:
        :return:
        """
        return self.tf_session.run(self.latent_representation, feed_dict={self.input_images: input_data})

    # TODO: reopen session
    def predict(self, X, y=None):
        """

        :param X:
        :param y:
        :return:
        """
        if self.model_is_trained:
            # reopen session (if model is saved to disk):
            self._load_session()
            self._print_training_warning()
            prediction = self.tf_session.run(self.output_images, feed_dict={self.input_images: X})
            # close session (if possible):
            self._close_session()
            return prediction
        else:
            raise RuntimeError("You must train transformer before predicting data!")

    def score(self, X, y=None):
        """

        :param X:
        :param y:
        :return:
        """
        if self.model_is_trained:
            # reopen session (if model is saved to disk):
            self._load_session()
            self._print_training_warning()
            prediction = self.tf_session.run(self.cost_function, feed_dict={self.input_images: X})
            # close session (if possible):
            self._close_session()
            return prediction
        else:
            raise RuntimeError("You must train transformer before scoring data!")

    def _close_session(self):
        """
        closes the tf.session if the trained model is saved to disk
        :return:

        """
        if self.session_saver_path is not None:
            self.tf_session.close()
            tf.reset_default_graph()

    def _print_training_warning(self):
        """
        prints a warning if a prediction/scoring is done without a completly trained ANN
        :return:
        """

        if not self.ann_status.eval(self.tf_session) == b'completely trained':
            print("WARNING: The ANN is not completely trained", file=sys.stderr)
