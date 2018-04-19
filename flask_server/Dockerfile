# --- predefined docker file derived from: ---
# https://github.com/tensorflow/tensorflow/blob/master/tensorflow/tools/docker/Dockerfile
#
FROM ubuntu:16.04

#LABEL maintainer="Craig Citro <craigcitro@google.com>"

# Pick up some TF dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libfreetype6-dev \
        libpng12-dev \
        libzmq3-dev \
        pkg-config \
        python \
        python3 \
        python3-pip \
        python3-setuptools \
        python-dev \
        rsync \
        software-properties-common \
        unzip \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN curl -O https://bootstrap.pypa.io/get-pip.py && \
    python get-pip.py && \
    rm get-pip.py

RUN pip --no-cache-dir install \
        setuptools\
        Pillow \
        h5py \
        matplotlib \
        numpy \
        pandas \
        scipy \
        sklearn
#
# --- ~~~ ---
#

# --- predefined Dockerfile from SwaggerAPI Server ---

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/app/flask_server
WORKDIR /usr/src/app/flask_server

COPY requirements.txt /usr/src/app/flask_server

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . /usr/src/app/flask_server

# --- ~~~ ---


# --- ports ---

# Swagger API port
EXPOSE 8080

# Tensorboard port
EXPOSE 6006

# --- ~~~ ---



# --- enviroment variables ---

ENV JOBLIB_TEMP_FOLDER=/tmp

# --- ~~~ ---




# --- commands ---

ENTRYPOINT ["python3"]

CMD ["debug_run.py"]

# --- ~~~ ---