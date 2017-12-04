import numpy as np

import ConcolutionalAutoEncoder

# load mnist data
#from tensorflow.examples.tutorials.mnist import input_data

#mnist = input_data.read_data_sets('MNIST_data', one_hot=True, reshape=False)

# extract train/test data
train_data = np.load("../data/mnist_train_data.npy")
#train_labels = mnist.train.labels.argmax(axis=1)
#train_label_marker = [r"$ {} $".format(str(number)) for number in train_labels]
test_data = np.load("../data/mnist_test_data.npy")

cae_test = ConcolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3], n_epochs=5,
                                               use_tensorboard=False, verbose=True,
                                               session_saver_path="./save")

cae_test.fit(train_data)

loaded_cae_test = ConcolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3], n_epochs=5,
                                                      use_tensorboard=False, verbose=True,
                                                      session_saver_path="./save", load_prev_session=True)
# compare scoring on both models
print(cae_test.score(test_data))
print(loaded_cae_test.score(test_data))

