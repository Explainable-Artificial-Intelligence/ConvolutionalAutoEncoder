import os
import sys

import numpy as np
import tensorflow as tf
from sklearn.base import BaseEstimator, TransformerMixin


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

    _cost_functions = ["squared_pixel_distance", "pixel_distance"]  # , "msssim"]

    def __init__(self, input_shape, number_of_stacks, filter_sizes, mirror_weights=False, activation_function="relu",
                 batch_size=100, max_predict_batch_size=1000, n_epochs=50, use_tensorboard=True, verbose=True,
                 learning_rate_function="static",
                 lr_initial_learning_rate=0.01, lr_decay_steps=1000, lr_decay_rate=0.9, lr_staircase=False,
                 lr_boundaries=[10000, 20000], lr_values=[1.0, 0.5, 0.1], lr_end_learning_rate=0.0001, lr_power=1.0,
                 lr_cycle=False, optimizer='AdamOptimizer', momentum=0.9, cf_cost_function="squared_pixel_distance",
                 cf_max_val=255, cf_filter_size=11, cf_filter_sigma=1.5, cf_k1=0.01, cf_k2=0.03, cf_weights=None,
                 random_function_for_weights="uniform", rw_alpha=0.5, rw_beta=None, rw_mean=0.0, rw_stddev=1.0,
                 rw_lam=0.5, rw_minval=-.5, rw_maxval=.5,
                 rw_seed=None, random_function_for_biases="zeros", rb_alpha=0.5, rb_beta=None, rb_mean=0.0,
                 rb_stddev=1.0, rb_lam=0.5, rb_minval=-.5, rb_maxval=.5, rb_seed=None, session_saver_path='./save/',
                 load_prev_session=False, session_save_duration=5, num_test_pictures=100):
        """
        Calls when initializing the transformer

        :param input_shape: list of  the dimensions of the input (and output) data
        :param number_of_stacks: list with the number of stacks of each hidden layer
        :param filter_sizes: defines the sizes of the filters of the hidden layer
        :param mirror_weights: if true the weights of the decoder are the same as the encoder
        :param activation_function: defines the activation function of the CAE
        :param batch_size: defines the batch size for the training
        :param n_epochs: defines the number of epochs in the training
        :param use_tensorboard: if true the tensorboard summary function on port 6006 is used
        :param verbose: activates a verbose console output
        :param learning_rate_function: defines the learning rate function used during training
        :param lr_initial_learning_rate: learning rate parameter: defines the initial learningrate
        :param lr_decay_steps: learning rate parameter: defines the number of steps which triggers a learning rate decay
        :param lr_decay_rate: learning rate parameter: defines the decay rate
        :param lr_staircase: learning rate parameter: determines if the learningrate decays smoothly or stepwise
        :param lr_boundaries: learning rate parameter: defines the boundaries for the different learning rates
                of lr_values
        :param lr_values: learning rate parameter: defines a list of different learing rates
                (for the different boundaries of lr_boundaries)
        :param lr_end_learning_rate: learning rate parameter:
        :param lr_power: learning rate parameter: defines the power of the polynomial of the polynomial decaying
                learning rate
        :param lr_cycle: learning rate parameter: A boolean, whether or not it should cycle beyond decay_steps.
        :param optimizer: defines the optimizer for the training
        :param momentum: defines the momentum for the momentum optimizer
        :param cf_cost_function:
        :param cf_max_val:
        :param cf_filter_size:
        :param cf_filter_sigma:
        :param cf_k1:
        :param cf_k2:
        :param cf_weights:
        :param random_function_for_weights: defines the random function, which is used to generate the initial weights
        :param rw_alpha: parameter for the random function of the initial weights: defines the alpha value for a gamma
                distribution
        :param rw_beta: parameter for the random function of the initial weights: defines the beta value for a gamma
                distribution
        :param rw_mean: parameter for the random function of the initial weights: defines the mean value for a normal
                distribution
        :param rw_stddev: parameter for the random function of the initial weights: defines the standard deviation for
                a normal distribution
        :param rw_lam: parameter for the random function of the initial weights: defines the rate parameter of a
                Poisson distribution
        :param rw_minval: parameter for the random function of the initial weights: defines the minimum value for a
                uniform distribution
        :param rw_maxval: parameter for the random function of the initial weights:  defines the maximum value for a
                uniform distribution
        :param rw_seed: parameter for the random function of the initial weights: defines a seed for a random
                initialisation
        :param random_function_for_biases: defines the random function, which is used to generate the initial biases
        :param rb_alpha:  parameter for the random function of the initial biases: defines the alpha value for a gamma
                distribution
        :param rb_beta: parameter for the random function of the initial biases: defines the beta value for a gamma
                distribution
        :param rb_mean: parameter for the random function of the initial biases: defines the mean value for a normal
                distribution
        :param rb_stddev: parameter for the random function of the initial biases: defines the standard deviation for
                a normal distribution
        :param rb_lam: parameter for the random function of the initial biases:  defines the rate parameter of a
                Poisson distribution
        :param rb_minval: parameter for the random function of the initial biases: defines the minimum value for a
                uniform distribution
        :param rb_maxval: parameter for the random function of the initial biases: defines the maximum value for a
                uniform distribution
        :param rb_seed: parameter for the random function of the initial biases: defines a seed for a random
                initialisation
        :param session_saver_path: defines a folder where the training progress is saved (None deactivates the saving)
        :param session_save_duration: defines the number of epochs after the current training state is saved to disk
        :param num_test_pictures: defines the number of train images in each epoch which can be used to visualize the
                current training state
        """

        # reset currently active tf graph
        tf.reset_default_graph()

        # define strides:
        self.layer_strides = [1, 2, 2, 1]

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
            # convert boundaries into float64
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

        # parse cost function parameters
        self.cf_cost_function = cf_cost_function
        self.cf_filter_size = cf_filter_size
        self.cf_max_val = cf_max_val
        self.cf_filter_sigma = cf_filter_sigma
        self.cf_k1 = cf_k1
        self.cf_k2 = cf_k2
        self.cf_weights = cf_weights

        # parse train parameters
        self.batch_size = batch_size
        self.max_predict_batch_size = max_predict_batch_size
        self.n_epochs = n_epochs
        self.use_tensorboard = use_tensorboard

        # define console output
        self.verbose = verbose

        # Mark model as untrained
        self.model_is_trained = False

        # set ANN status:
        # self.ann_status = tf.Variable("initialized", name="ann_status", dtype=tf.string)
        self.ann_status_local = "initialized"
        # self.trained_epochs = tf.Variable(0, dtype=tf.int32, name="trained_epochs")
        self.trained_epochs_local = 0

        self._build_ann()

        # init train status variables
        self._init_train_status_variables()

        # create tensorflow session
        self.tf_session = tf.Session()

        # init status images
        self.num_test_pictures = num_test_pictures
        self.current_sample_indices = np.array([])
        self.current_input_image_sample = np.array([])
        self.current_latent_image_sample = np.array([])
        self.current_output_image_sample = np.array([])
        self.current_train_step = 0
        self.current_train_epoch = 0

        # initialize session saver:
        # session_saver_path = None
        self.session_saver_path = session_saver_path
        self.session_save_duration = session_save_duration
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
            # if not self.ann_status.eval(self.tf_session) == b'training':

            # reset currently active tf graph
            tf.reset_default_graph()
            self.tf_session = tf.Session()

            prev_session = tf.train.get_checkpoint_state(self.session_saver_path)

            self.session_saver = tf.train.import_meta_graph(prev_session.model_checkpoint_path + '.meta')

            self.session_saver.restore(self.tf_session, prev_session.model_checkpoint_path)

            self._build_ann(restore=True)

            self._restore_variables_from_checkpoint()

            if self.verbose:
                print("session restored!")

    def _restore_variables_from_checkpoint(self):
        # get trained variables from file:
        self.global_step = tf.get_default_graph().get_tensor_by_name("global_step:0")
        # self.ann_status = tf.get_default_graph().get_tensor_by_name("ann_status:0")

    def _build_ann(self, restore=False):
        """
        Wrapper function to build the complete ANN topology and define all required session variables
        (important for loading previous session)
        """
        # build ANN
        self._build_network_topology(restore)
        # define cost function
        self._define_cost_function()
        # define learning rate function
        self._define_learning_rate_function()
        # define optimizer
        self._define_optimizer(restore)

    def _build_network_topology(self, restore=False):
        """
        Builds the ANN topology for a Convolutional Autencoder
        """
        # create placeholder for input images
        self.input_images = tf.placeholder(tf.float32, self.input_shape, name="Input_Images")

        # define model topology
        # encoder part
        self._build_encoder(restore)

        # decoder part
        self._build_decoder(restore)

    def _build_encoder(self, restore=False):
        """
        Builds the encoder part of the Convolutional Autencoder
        """
        # construct the encoder
        self.encoder_weights = []
        self.encoder_biases = []
        self.encoder_shapes = []
        self.layers = []
        current_input = self.input_images
        # self.layers.append(self.input_images)
        # iterate over all encoder layer
        print(list(enumerate(self.number_of_stacks)))
        for layer_i, n_output in enumerate(self.number_of_stacks):
            output = self._build_encoder_layer(current_input, layer_i, n_output, restore)
            self.layers.append(output)
            current_input = output
            print(output.get_shape())

        # save latent representation
        self.latent_representation = output

    def _build_encoder_layer(self, current_input, layer_i, n_output, restore=False):
        """
        Builds a single encoder layer

        :param restore:
        :param current_input: input from a previous encoder layer
        :param layer_i: index of the new layer
        :param n_output: number of output stacks
        :return: output of the new layer
        """
        number_of_input_layers = current_input.get_shape().as_list()[3]
        self.encoder_shapes.append(current_input.get_shape().as_list())
        if restore:
            weights_of_layer_i = tf.get_default_graph().get_tensor_by_name(
                "encoder_weights_layer_" + str(layer_i) + ":0")
            bias_of_layer_i = tf.get_default_graph().get_tensor_by_name("encoder_biases_layer_" + str(layer_i) + ":0")
        else:
            weights_of_layer_i = self._create_random_layer_weights(
                [self.filter_sizes[layer_i], self.filter_sizes[layer_i], number_of_input_layers, n_output],
                "encoder_weights_layer_" + str(layer_i))
            bias_of_layer_i = self._create_layer_biases([n_output], "encoder_biases_layer_" + str(layer_i))
        self.encoder_weights.append(weights_of_layer_i)
        self.encoder_biases.append(bias_of_layer_i)
        # TODO: understand strides /padding
        output = self.activation_function(
            tf.nn.conv2d(current_input, weights_of_layer_i, strides=self.layer_strides, padding='SAME') +
            bias_of_layer_i)
        return output

    def _create_random_layer_weights(self, shape, name=""):
        """
        creates a tensor of random variables in a given shape and given random distribution

        :param shape: shape of the generating tensor
        :param names: optional varable names
        :return: tensor with random weight varaibles
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

    def _build_decoder(self, restore=False):
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
            output = self._build_decoder_layer(current_input, layer_i, shape, restore)
            self.layers.append(output)
            current_input = output

        self.output_images = output
        # tf.reshape(self.output_images, self.input_images.get_shape())

    def _build_decoder_layer(self, current_input, layer_i, shape, restore=False):
        """

        :param current_input:
        :param layer_i:
        :param shape:
        :return:
        """
        # reuse weights and biases
        reversed_encoder_weights = list(reversed(self.encoder_weights))
        reversed_encoder_biases = list(reversed(self.encoder_biases))

        if restore:
            weights_of_layer_i = tf.get_default_graph().get_tensor_by_name(
                "decoder_weights_layer_" + str(layer_i) + ":0")
            biases_of_layer_i = tf.get_default_graph().get_tensor_by_name(
                "decoder_biases_layer_" + str(layer_i) + ":0")
        else:
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
        output = self.activation_function(tf.nn.conv2d_transpose(current_input, weights_of_layer_i,
                                                                 tf.stack(
                                                                     [tf.shape(self.input_images)[0], shape[1],
                                                                      shape[2], shape[3]]),
                                                                 strides=self.layer_strides,
                                                                 padding='SAME') + biases_of_layer_i)
        return output

    def _define_cost_function(self):
        """

        :return:
        """

        # check if correct cost function is provided
        if self.cf_cost_function not in self._cost_functions:
            print("No supported cost function provided, using squared_pixel_distances")
            self.cf_cost_function = "squared_pixel_distance"

        # define correct cost function:
        if self.cf_cost_function == "squared_pixel_distance":
            self.cost_function = tf.reduce_sum(tf.square(self.output_images - self.input_images))
            return
        if self.cf_cost_function == "pixel_distance":
            self.cost_function = tf.reduce_sum(tf.abs(self.output_images - self.input_images))
            return

        print("Error parsing cost function!")

        # if self.cf_cost_function == "msssim":
        #     print(self.output_images.get_shape())
        #     print(self.input_images.get_shape())
        #     # self.cost_function = tf.reduce_sum(tf.map_fn(
        #     #     lambda x: MultiScaleSSIM(x[0], x[1], self.cf_max_val, self.cf_filter_size, self.cf_filter_sigma,
        #     #                              self.cf_k1, self.cf_k2, self.cf_weights),
        #     #     (self.input_images, self.output_images)))
        #
        #     self.cost_function = MultiScaleSSIM(self.input_images, self.output_images, self.cf_max_val,
        #                                         self.cf_filter_size, self.cf_filter_sigma, self.cf_k1, self.cf_k2,
        #                                         self.cf_weights)
        #     return

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

    def _define_optimizer(self, restore=False):
        """

        :return:
        """
        # on loading: get optimizer from file:
        if restore:
            self.final_optimizer = tf.get_collection("optimizer")[0]
            return

        # special cases:
        # AdagradDAOptimizer:
        if self.optimizer == tf.train.AdagradDAOptimizer:
            self.final_optimizer = self.optimizer(self.learning_rate, self.global_step).minimize(
                self.cost_function, self.global_step)
            tf.add_to_collection("optimizer", self.final_optimizer)
            return
        # MomentumOptimizer:
        if self.optimizer == tf.train.MomentumOptimizer:
            self.final_optimizer = self.optimizer(self.learning_rate, self.momentum).minimize(
                self.cost_function, self.global_step)
            tf.add_to_collection("optimizer", self.final_optimizer)
            return

        # optimizer with std. parameters
        self.final_optimizer = self.optimizer(self.learning_rate).minimize(
            self.cost_function, self.global_step)
        tf.add_to_collection("optimizer", self.final_optimizer)

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
        performs a complete training of the ANN
        """
        # reopen a previous training:
        if self.model_is_trained:
            self._load_session()

        # set ANN status
        # self.tf_session.run(self.ann_status.assign("training"))
        self.ann_status_local = "training"

        # Fit all training data
        # start_epoch = self.trained_epochs.eval(self.tf_session)
        start_epoch = self.trained_epochs_local
        for epoch_i in range(start_epoch, self.n_epochs):
            # mark model as trained:
            self.model_is_trained = True

            self._train_model_single_epoch(epoch_i, train_data)
            # save session  after each x epochs
            if self.session_saver_path is not None and epoch_i % self.session_save_duration == 0:
                self.session_saver.save(self.tf_session, os.path.join(self.session_saver_path, 'tf_session.bak'),
                                        global_step=self.global_step)
                print("model saved to %s" % str(os.path.join(self.session_saver_path, 'tf_session.bak')))
            # mark model as trained:
            self.model_is_trained = True
            # print(self.ann_status.eval(self.tf_session))
            # if not self.ann_status.eval(self.tf_session) == b'training':
            #     break
            print(self.ann_status_local)
            if not self.ann_status_local == "training":
                break
            # set number of trained epochs:
            # self.tf_session.run(self.trained_epochs.assign_add(1))
            self.trained_epochs_local += 1

            # evaluate current train status:
            self._evaluate_current_ann_status(train_data)

        # set new ann status:
        # if self.tf_session.run(self.trained_epochs) == self.n_epochs:
        if self.trained_epochs_local == self.n_epochs:
            # self.tf_session.run(self.ann_status.assign("completely trained"))
            self.ann_status_local = "completely trained"
        else:
            # self.tf_session.run(self.ann_status.assign("partly trained"))
            self.ann_status_local = "partly trained"

            # print("%i of %i epochs trained" % (self.tf_session.run(self.trained_epochs), self.n_epochs))
            print("%i of %i epochs trained" % self.trained_epochs_local, self.n_epochs)
            # close session
            # self.tf_session.close()

        # save final train status
        if self.session_saver_path is not None:
            self.session_saver.save(self.tf_session, os.path.join(self.session_saver_path, 'tf_session_final.bak'),
                                    global_step=self.global_step)
            print("final model saved to %s" % str(os.path.join(self.session_saver_path, 'tf_session_final.bak')))
            # TODO remove
            # print(self.tf_session.run(self.encoder_weights[0][0][0]))
            # print(self.tf_session.run(self.decoder_weights))
            self._close_session()

    def _train_model_single_epoch(self, epoch_i, train_data):
        """
        trains the ANN for one single epoch

        :param epoch_i: current epoch
        :return:
        """
        for batch_index in range(len(train_data) // self.batch_size):
            # check if training is aborted:
            # if not self.ann_status.eval(self.tf_session) == b'training':
            #     return
            if not self.ann_status_local == "training":
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
        # if not self.ann_status.eval(self.tf_session) == b'training':
        #     return
        if not self.ann_status_local == "training":
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

        # save train status
        self.train_status["epoch"].append(self.trained_epochs_local)
        self.train_status["step"].append(int(step))
        self.train_status["train_cost"].append(float(train_cost))
        if type(self.learning_rate) is float:
            self.train_status["learning_rate"].append(self.learning_rate)
        else:
            self.train_status["learning_rate"].append(float(self.tf_session.run(self.learning_rate)))

        if self.verbose and step % 10 == 0:
            print(str(step) + ": " + str(train_cost))

    def _evaluate_current_ann_status(self, train_data):
        """


        """

        # get random subset of train images
        if len(self.current_sample_indices) != len(train_data):
            self.current_sample_indices = np.random.randint(0, len(train_data), size=self.num_test_pictures)

        # get input image subset:
        self.current_input_image_sample = train_data[self.current_sample_indices]

        # get latent representation and output images of the current subset
        self.current_output_image_sample, self.current_latent_image_sample, self.current_train_step = self.tf_session.run(
            [self.output_images, self.latent_representation, self.global_step],
            feed_dict={self.input_images: self.current_input_image_sample})
        self.current_train_epoch = self.trained_epochs_local

    def update_ann_status(self, status):
        """

        :return:
        """
        if status == "stop":
            # return if session is already closed
            if self.tf_session._closed:
                # self._load_session()
                # self.tf_session.run(self.ann_status.assign("stop", use_locking=True))
                # self._close_session()
                return
            # self.tf_session.run(self.ann_status.assign("stop", use_locking=True))
            self.ann_status_local = "stop"

    def get_latent_representation(self, input_data):
        """

        :param input_data:
        :return:
        """
        if self.model_is_trained:
            # reopen session (if model is saved to disk):
            self._load_session()
            self._print_training_warning()

            # split input data into batches:
            input_batches = np.array_split(input_data, self.max_predict_batch_size)
            latent_batches = []
            for input_batch in input_batches:
                latent_batch = self.tf_session.run(self.latent_representation,
                                                   feed_dict={self.input_images: input_batch})
                latent_batches.append(latent_batch)
            # close session (if possible):
            self._close_session()

            # concatenate batches to one array:
            latent_representation = np.vstack(latent_batches)

            return latent_representation
        else:
            raise RuntimeError("You must train transformer before predicting data!")

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

            # split input data into batches:
            input_batches = np.array_split(X, self.max_predict_batch_size)
            prediction_batches = []
            for input_batch in input_batches:
                prediction_batch = self.tf_session.run(self.output_images, feed_dict={self.input_images: input_batch})
                prediction_batches.append(prediction_batch)
            # close session (if possible):
            self._close_session()

            # concatenate  batches to one array:
            prediction = np.vstack(prediction_batches)

            return prediction
        else:
            raise RuntimeError("ERROR: You have to train transformer before predicting data!")

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
            # split input data into batches:
            # input_batches = np.array_split(X, 1) # self.max_predict_batch_size)
            costs = []
            # compute cost for each image separately
            for i in range(len(X)):
                single_image = X[i:i + 1, :, :, :]
                cost = self.tf_session.run(self.cost_function, feed_dict={self.input_images: single_image})
                costs.append(float(cost))
            # close session (if possible):
            self._close_session()

            # concat single batches:
            # concatenated_costs = list(itertools.chain(*list(costs)))

            return costs
        else:
            raise RuntimeError("ERROR: You have to train transformer before scoring data!")

    def _close_session(self):
        """
        closes the tf.session if the trained model is saved to disk

        :return:

        """
        # if self.session_saver_path is not None or not self.ann_status.eval(self.tf_session) == b'training':
        if self.session_saver_path is not None or not self.ann_status == 'training':
            self.tf_session.close()
            tf.reset_default_graph()

    def _print_training_warning(self):
        """
        prints a warning if a prediction/scoring is done without a completly trained ANN

        :return:
        """

        # if not self.ann_status.eval(session=self.tf_session) == b'completely trained':
        if not self.ann_status_local == 'completely trained':
            print("WARNING: The ANN is not completely trained", file=sys.stderr)

    def _init_train_status_variables(self):
        """

        :return:
        """
        self.train_status = {"step": [], "epoch": [], "train_cost": [], "learning_rate": []}

    def get_train_status(self, start_idx=None, end_idx=None):
        """
        returns the current train status (train_cost, learning rate) as dict

        :param start_idx:
        :param end_idx:
        :return:
        """
        if start_idx is None:
            if end_idx is None:
                # return the complete lists of status variables
                return self.train_status
            else:
                # return the status variables up to the end index
                sliced_train_status = {"step": self.train_status["step"][:end_idx],
                                       "epoch": self.train_status["epoch"][:end_idx],
                                       "train_cost": self.train_status["train_cost"][:end_idx],
                                       "learning_rate": self.train_status["learning_rate"][:end_idx]}
                return sliced_train_status
        else:
            if end_idx is None:
                # return the status variables after the start index
                sliced_train_status = {"step": self.train_status["step"][start_idx:],
                                       "epoch": self.train_status["epoch"][start_idx:],
                                       "train_cost": self.train_status["train_cost"][start_idx:],
                                       "learning_rate": self.train_status["learning_rate"][start_idx:]}
                return sliced_train_status
            else:
                # return the status variables in a given range
                sliced_train_status = {"step": self.train_status["step"][start_idx:end_idx],
                                       "epoch": self.train_status["epoch"][start_idx:end_idx],
                                       "train_cost": self.train_status["train_cost"][start_idx:end_idx],
                                       "learning_rate": self.train_status["learning_rate"][start_idx:end_idx]}
                return sliced_train_status

    def get_current_status_images(self, size):
        """
        returns the input, output and latent representation of a random subset of train images (using the current ANN
            train status)

        :param size: number of samples
        :return:
        """

        max_idx = min(self.num_test_pictures, size)
        return {"step": self.current_train_step, "epoch": self.current_train_epoch,
                "input_images": self.current_input_image_sample[:max_idx],
                "latent_representation": self.current_latent_image_sample[:max_idx],
                "output_images": self.current_output_image_sample[:max_idx],
                "indices": self.current_sample_indices[:max_idx]}
