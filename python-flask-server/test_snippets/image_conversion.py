import os

import numpy as np
from PIL import Image

output_path = "../data/mnist/"
if not os.path.isdir(output_path):
    os.mkdir(output_path)

# train data:
output_path_train = os.path.join(output_path, "train")
if not os.path.isdir(output_path_train):
    os.mkdir(output_path_train)

train_data = np.load("../data/mnist_train_data.npy")
i = 1
for image_array in train_data:
    image_array = 255 * image_array.reshape([28, 28])
    img = Image.fromarray(image_array.astype(np.uint8), mode='L')
    #with open(os.path.join(output_path_train, "train_image_%05d.png" % i), 'w') as image_file:
    img.save(os.path.join(output_path_train, "train_image_%05d.png" % i), format='PNG')
    print(os.path.join(output_path_train, "train_image_%05d.png" % i) + " ...saved")
    i += 1

print("finished")