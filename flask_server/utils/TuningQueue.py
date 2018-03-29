import sys

from flask_server.utils.Storage import Storage


class TuningQueue(object):
    """
    A class which allows too execute the parameter tuning in a different thread and supports controls and stats
    """

    tuning_status = ""
    current_running_model = object()

    def __init__(self):
        pass

    def run_tuning(self, train_data, test_data=None):
        # update tuning status
        Storage.tuning_status = "running"

        # iterate over all combinations
        for parameter_combination in Storage.tuning_ANNs:

            # start training for this parameter combination:
            self.current_running_model = parameter_combination
            self.current_running_model.ann.fit(train_data)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                break

            # save final train stats and images:
            self.current_running_model.train_performance = self.current_running_model.ann.get_train_status()
            self.current_running_model.train_images = self.current_running_model.ann.get_current_status_images(
                sys.maxsize)

            if test_data is not None:
                # perform a scoring of the test data
                scoring = self.current_running_model.ann.score(test_data)
                print(sum(scoring))
                parameter_combination.final_score = sum(scoring)

            # stop tuning if aborted
            if self.tuning_status == "stop":
                # update tuning status
                Storage.tuning_status = "aborted"
                break

        # update tuning status
        Storage.tuning_status = "finished"

    def stop_tuning(self):
        # abort tuning queue
        self.tuning_status = "stop"

        # update tuning status
        Storage.tuning_status = "aborting"

        # abort current training
        self.current_running_model.ann.update_ann_status("stop")

    def get_training_performance(self):
        # get current running cae:
        cae = self.current_running_model.ann

        # get previous training step:
        prev_step = self.current_running_model.train_step

        # get current training status:
        current_train_performance = cae.get_train_status(start_idx=prev_step)

        # update previous training step:
        self.current_running_model.train_step += len(current_train_performance["train_cost"])

        return current_train_performance

    def get_processed_image_data(self, set_size=100):
        return self.current_running_model.ann.get_current_status_images(set_size)
