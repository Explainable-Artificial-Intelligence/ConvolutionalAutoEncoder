"""includes a static class which stores all server data"""
import numpy as np


class Storage(object):
    # storrage items
    train_data = []
    cae = object()
    parameter_set = {}

    @classmethod
    def set_train_data(cls, train_data):
        cls.train_data = train_data

    @classmethod
    def get_train_data(cls):
        return cls.train_data

    @classmethod
    def set_cae(cls, cae):
        cls.cae = cae

    @classmethod
    def get_cae(cls):
        return cls.cae
