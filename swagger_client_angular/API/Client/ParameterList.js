goog.provide('API.Client.ParameterList');

/**
 * @record
 */
API.Client.ParameterList = function() {}

/**
 * @type {!Array<!Array<!number>>}
 * @export
 */
API.Client.ParameterList.prototype.inputShape;

/**
 * @type {!Array<!Array<!number>>}
 * @export
 */
API.Client.ParameterList.prototype.numberOfStacks;

/**
 * @type {!Array<!Array<!number>>}
 * @export
 */
API.Client.ParameterList.prototype.filterSizes;

/**
 * @type {!Array<!boolean>}
 * @export
 */
API.Client.ParameterList.prototype.mirrorWeights;

/**
 * @type {!Array<!string>}
 * @export
 */
API.Client.ParameterList.prototype.activationFunction;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.batchSize;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.nEpochs;

/**
 * @type {!boolean}
 * @export
 */
API.Client.ParameterList.prototype.useTensorboard;

/**
 * @type {!boolean}
 * @export
 */
API.Client.ParameterList.prototype.verbose;

/**
 * @type {!Array<!string>}
 * @export
 */
API.Client.ParameterList.prototype.learningRateFunction;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.lrInitialLearningRate;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.lrDecaySteps;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.lrDecayRate;

/**
 * @type {!Array<!boolean>}
 * @export
 */
API.Client.ParameterList.prototype.lrStaircase;

/**
 * @type {!Array<!Array<!number>>}
 * @export
 */
API.Client.ParameterList.prototype.lrBoundaries;

/**
 * @type {!Array<!Array<!number>>}
 * @export
 */
API.Client.ParameterList.prototype.lrValues;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.lrEndLearningRate;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.lrPower;

/**
 * @type {!Array<!boolean>}
 * @export
 */
API.Client.ParameterList.prototype.lrCycle;

/**
 * @type {!Array<!string>}
 * @export
 */
API.Client.ParameterList.prototype.optimizer;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.momentum;

/**
 * @type {!Array<!string>}
 * @export
 */
API.Client.ParameterList.prototype.randomFunctionForWeights;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwAlpha;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwBeta;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwMean;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwStddev;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwLam;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwMinval;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwMaxval;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rwSeed;

/**
 * @type {!Array<!string>}
 * @export
 */
API.Client.ParameterList.prototype.randomFunctionForBiases;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbAlpha;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbBeta;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbMean;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbStddev;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbLam;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbMinval;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbMaxval;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.rbSeed;

/**
 * @type {!string}
 * @export
 */
API.Client.ParameterList.prototype.sessionSaverPath;

/**
 * @type {!boolean}
 * @export
 */
API.Client.ParameterList.prototype.loadPrevSession;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.sessionSaveDuration;

/**
 * @type {!Array<!number>}
 * @export
 */
API.Client.ParameterList.prototype.numTestPictures;

