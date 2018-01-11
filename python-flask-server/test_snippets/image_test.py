import base64
import io

import numpy as np
from PIL import Image

# train_data = np.load("../data/mnist_train_data.npy")
#
#
# raw_image_array = train_data[0] * 255
# int_image_array = np.asarray(raw_image_array, dtype=int).reshape([28, 28])
# img = Image.fromarray(int_image_array.astype('uint8'))
#
#
# imgByteArr = io.BytesIO()
# img.save(imgByteArr, format='PNG')
# imgByteArr = imgByteArr.getvalue()
#
# print(base64.b64encode(imgByteArr))
# print()

# for image_array in input_data:
#     #image = tf.image.encode_png(tf.convert_to_tensor(image_array * 255, dtype="uint16"))
#     #image
#     img = Image.fromarray(np.array(image_array * 255, dtype="int32"))
#     img.save("test.png")
#     #with open("image.png", "w") as output_file:
#     #    output_file.write(image)


train_data = np.load("../data/cifar_train_data.npy")


raw_image_array = train_data[0] * 255
int_image_array = np.asarray(raw_image_array, dtype=int)
img = Image.fromarray(int_image_array.astype('uint8'))


imgByteArr = io.BytesIO()
img.save(imgByteArr, format='PNG')
imgByteArr = imgByteArr.getvalue()

print(base64.b64encode(imgByteArr))
print()