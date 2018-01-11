import ConvolutionalAutoEncoder


def test():
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

    # quick test for all optimizer:
    print()
    print("\tOptimizer:")
    optimizers = ['GradientDescentOptimizer', 'AdadeltaOptimizer', 'AdagradOptimizer', 'AdamOptimizer', 'FtrlOptimizer',
                  'ProximalGradientDescentOptimizer', 'ProximalAdagradOptimizer', 'RMSPropOptimizer',
                  'AdagradDAOptimizer', 'MomentumOptimizer']
    for optimizer in optimizers:
        print(optimizer)
        cae_test = ConvolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3],
                                                       optimizer=optimizer, n_epochs=3, use_tensorboard=False,
                                                       verbose=True)
        cae_test.fit(train_data)
        print("Test successful!")

    # quick test for all activation functions:
    print()
    print("\tActivations:")
    activation_functions = ['relu', 'relu6', 'elu', 'softplus', 'softsign', 'sigmoid', 'tanh']
    for act_fct in activation_functions:
        print(act_fct)
        cae_test = ConvolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3],
                                                       activation_function=act_fct, n_epochs=3, use_tensorboard=False,
                                                       verbose=False)
        cae_test.fit(train_data)
        print("Test successful!")

    # quick test for all learning rate decays:
    print()
    print("\tLearning rates:")
    learning_rate_functions = ['piecewise_constant', 'static', 'exponential_decay', 'inverse_time_decay',
                               'natural_exp_decay', 'polynomial_decay']
    for lr_fct in learning_rate_functions:
        print(lr_fct)
        cae_test = ConvolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3],
                                                       learning_rate_function=lr_fct, n_epochs=3, use_tensorboard=False,
                                                       verbose=False)
        cae_test.fit(train_data)
        print("Test successful!")


def main():
    test()
    # test_on_cifar_dataset()


if __name__ == "__main__":
    main()
