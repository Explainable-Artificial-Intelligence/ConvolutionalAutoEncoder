# load mnist data
import numpy as np
from tensorflow.examples.tutorials.mnist import input_data

mnist = input_data.read_data_sets('MNIST_data', one_hot=True, reshape=False)

# extract train/test data
train_data = mnist.train.images.tolist()
train_labels = mnist.train.labels.argmax(axis=1)
train_label_marker = [r"$ {} $".format(str(number)) for number in train_labels]
test_data = mnist.test.images.tolist()


# write test/train data to file

# with open("../data/mnist_train_data.txt", 'w') as train_data_file:
#     for line in input_data:
#         #print(str(line) + "\n")
#         train_data_file.write(str(line) + "\n")
#
# train_data_file.close()
#
# with open("../data/mnist_test_data.txt", 'w') as test_data_file:
#     for line in test_data:
#         #print(str(line) + "\n")
#         test_data_file.write(str(line) + "\n")
#
# test_data_file.close()


np.save("../data/mnist_train_data", train_data)
np.save("../data/mnist_test_data", test_data)

