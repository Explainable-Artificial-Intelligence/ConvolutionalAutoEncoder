import numpy as np

from flask_server.utils import ConvolutionalAutoEncoder

# extract train/test data


train_data = np.load("../../data/mnist_train_data.npy")
test_data = np.load("../../data/mnist_test_data.npy")

cae_test = ConvolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3], n_epochs=5,
                                               use_tensorboard=False, verbose=True,
                                               session_saver_path="../save")

cae_test.fit(train_data)

print(sum(cae_test.score(test_data)))
