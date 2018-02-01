
import numpy as np

# extract train/test data
from flask_server import ConvolutionalAutoEncoder

train_data = np.load("../../data/mnist_train_data.npy")
test_data = np.load("../../data/mnist_test_data.npy")


loaded_cae_test = ConvolutionalAutoEncoder.SklearnCAE([None, 28, 28, 1], [12, 8, 8, 4], [5, 5, 3, 3], n_epochs=5,
                                                      use_tensorboard=False, verbose=True,
                                                      session_saver_path="../save", load_prev_session=True)
print(loaded_cae_test.score(test_data))
