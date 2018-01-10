"""
Helper functions to handle the communication between Storage and ANN
"""
from utils.Storage import Storage


def compute_output_images(datasetname):
    # check if output images already computed
    if not Storage.output_images_computed(datasetname):
        # compute all output images for this dataset:

        # get CAE
        cae = Storage.get_cae()
        # predict train images
        output_images = cae.predict(Storage.get_input_data(datasetname))
        # save prediction
        Storage.set_output_data(datasetname, output_images)


class TuningQueue(object):
    """
    A class which allows too execute the parameter tuning in a different thread and supports controls and stats
    """
    tuning_combinations = []
    tuning_status = ""
    train_dataset_name = ""
    current_running_cae = object()

    def __init__(self, dataset_name="train_data"):
        self.train_dataset_name = dataset_name

    def run_tuning(self, train_data, test_data=None):
        # iterate over all combinations
        for parameter_combination in Storage.tuning_ANNs:

            # start training for this parameter combination:
            self.current_running_cae = parameter_combination.ann
            self.current_running_cae.fit(train_data)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                break

            if test_data is not None:
                # perform a scoring of the test data
                scoring = self.current_running_cae.score(test_data)
                print(sum(scoring))
                parameter_combination.final_score = sum(scoring)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                break

    def stop_tuning(self):
        # abort tuning queue
        self.tuning_status = "stop"

        # abort current training
        self.current_running_cae.update_ann_status("stop")
