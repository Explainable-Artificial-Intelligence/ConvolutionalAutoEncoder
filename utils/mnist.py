import ConcolutionalAutoEncoder


def test_on_mnist_dataset():
    """

    :return:
    """
    # load mnist data
    from tensorflow.examples.tutorials.mnist import input_data
    mnist = input_data.read_data_sets('MNIST_data', one_hot=True, reshape=False)

    # extract train/test data
    train_data = mnist.train.images
    train_labels = mnist.train.labels.argmax(axis=1)
    train_label_marker = [r"$ {} $".format(str(number)) for number in train_labels]
    test_data = mnist.test.images
    # create ANN

    cae_mnist = ConcolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3], rw_minval=-0.5, rw_maxval=0.5)

    cae_mnist.fit(train_data)

    print(cae_mnist.score(test_data))
    # final train error: ~500-700
    # final test error: 62417.8

    # cae_mnist_mirror = ConcolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3],
    #                                                       mirror_weights=True)

    # cae_mnist_mirror.fit(train_data)

    # print(cae_mnist_mirror.score(test_data))
    # final train error: ~550-860
    # final test error: 70167.9








    # # define learning parameters
    # optimizer, batch_size, n_epochs = define_learning_parameters(auto_encoder['cost'], learning_rate=0.01,
    #                                                              batch_size=1000, n_epochs=500)
    #
    # # create tensorflow session
    # sess = tf.Session()
    #
    # # init tensorboard writer
    # merged_summary = tf.summary.merge_all()
    # print(os.getcwd())
    # test_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'test'), sess.graph)
    # train_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'train'), sess.graph)
    #
    # sess.run(tf.global_variables_initializer())
    #
    # # train model
    # train_model(sess, auto_encoder, 'cost', 'X', train_data, test_data, optimizer, batch_size, n_epochs,
    #             train_writer,
    #             test_writer, merged_summary)
    #
    # # evaluate latent representation
    # cmap = plt.get_cmap('jet', 10)
    # visualize_latent_representation(auto_encoder, sess, train_data, train_labels)


def main():
    test_on_mnist_dataset()
    # test_on_cifar_dataset()


if __name__ == "__main__":
    main()


# def define_learning_parameters(variable_to_minimize, learning_rate=0.01, batch_size=100, n_epochs=50):
#     """
#
#     :param variable_to_minimize:
#     :param learning_rate:
#     :param batch_size:
#     :param n_epochs:
#     :return:
#     """
#     optimizer = tf.train.AdamOptimizer(learning_rate).minimize(variable_to_minimize)
#
#     # visualisation
#     tf.summary.scalar("learning_rate", learning_rate)
#     tf.summary.scalar("mean_cost", variable_to_minimize / batch_size)
#     return optimizer, batch_size, n_epochs
#
#
#
#
#     def visualize_latent_representation(auto_encoder, sess, train_data, train_labels):
#         latent_representation_train_data = get_latent_representation(sess, auto_encoder, 'X', train_data, 'Z')
#         print(latent_representation_train_data.shape)
#         latent_representation_train_data = latent_representation_train_data.reshape(
#             latent_representation_train_data.shape[0], -1)
#         print(latent_representation_train_data.shape)
#         y_kmeans = KMeans(n_clusters=10).fit_predict(latent_representation_train_data)
#         pca = PCA(n_components=2)
#         pca.fit(latent_representation_train_data)
#         transformed_train_data = pca.transform(latent_representation_train_data)
#         plt.figure(figsize=(12, 12))
#         cmap = plt.get_cmap('jet', 10)
#         colors = plt.cm.jet(np.linspace(0, 1, 10))
#         for pos, number, cluster in zip(transformed_train_data[:3000], train_labels[:3000], y_kmeans[:3000]):
#             plt.scatter(pos[0], pos[1], marker="${}$".format(str(number)), color=colors[cluster])
#         plt.show()
#         # plt.figure(figsize=(12, 12))
#         # plt.scatter(transformed_train_data[:, 0], transformed_train_data[:, 1], c=train_labels)
#         # plt.show()
#
#     def read_cifar_file(filename):
#         """
#
#         :param filename:
#         :return:
#         """
#         with open(filename, 'rb') as fo:
#             dict = pickle.load(fo, encoding='bytes')
#         return dict
#
#     def convert_raw_image_data(raw_data, shape, convert_pixel_values_to_float=True):
#         """
#
#         :param raw_data:
#         :return:
#         """
#         # convert to np array:
#         raw_data = np.array(raw_data, dtype=float)
#         # convert pixel values to float
#         if convert_pixel_values_to_float:
#             raw_data = raw_data / 255.0
#         # reshape the data
#         images = raw_data.reshape(shape).swapaxes(1, 3).swapaxes(1, 2)
#
#         return images
#
#     def test_on_cifar_dataset():
#         # load mnist data
#         # define input file paths:
#         filename_prefix = "CIFAR-10/cifar-10-batches-py/data_batch_"
#         cifar_train_data_list = []
#         cifar_train_labels = []
#
#         # read train data
#         for i in range(1, 6):
#             file_dict = read_cifar_file(filename_prefix + str(i))
#             cifar_train_data_list = itertools.chain(cifar_train_data_list, file_dict[b'data'])
#             cifar_train_labels = itertools.chain(cifar_train_labels, file_dict[b'labels'])
#
#         train_data = convert_raw_image_data(list(cifar_train_data_list), [-1, 3, 32, 32])
#
#         # read test data
#         test_data_filename = "CIFAR-10/cifar-10-batches-py/test_batch"
#         file_dict = read_cifar_file(test_data_filename)
#         train_labels = file_dict[b'labels']
#
#         test_data = convert_raw_image_data(file_dict[b'data'], [-1, 3, 32, 32])
#
#         # create ANN
#         auto_encoder = build_network_topology(input_shape=[None, 32, 32, 3], number_of_stacks=[50, 35, 25, 20],
#                                               filter_sizes=[3, 3, 3, 2, 2])
#
#         # define learning parameters
#         optimizer, batch_size, n_epochs = define_learning_parameters(auto_encoder['cost'])
#
#         # create tensorflow session
#         sess = tf.Session()
#
#         # init tensorboard writer
#         merged_summary = tf.summary.merge_all()
#         test_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'testCifar'), sess.graph)
#         train_writer = tf.summary.FileWriter(os.path.join(os.getcwd(), 'trainCifar'), sess.graph)
#
#         sess.run(tf.global_variables_initializer())
#
#         # train model
#         train_model(sess, auto_encoder, 'cost', 'X', train_data, test_data, optimizer, batch_size, n_epochs,
#                     train_writer,
#                     test_writer, merged_summary)
#
#         visualize_latent_representation(auto_encoder, sess, train_data, train_labels)
#
