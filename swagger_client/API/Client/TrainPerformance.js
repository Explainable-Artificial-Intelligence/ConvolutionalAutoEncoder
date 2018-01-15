goog.provide('API.Client.TrainPerformance');

/**
 * @record
 */
API.Client.TrainPerformance = function() {}

/**
 * @type {!string}
 * @export
 */
API.Client.TrainPerformance.prototype.modelId;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.TrainPerformance.prototype.cost;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.TrainPerformance.prototype.currentLearningRate;

