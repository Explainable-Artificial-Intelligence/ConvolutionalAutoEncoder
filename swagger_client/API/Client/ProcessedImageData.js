goog.provide('API.Client.ProcessedImageData');

/**
 * @record
 */
API.Client.ProcessedImageData = function() {}

/**
 * @type {!Array<!API.Client.Image>}
 * @export
 */
API.Client.ProcessedImageData.prototype.inputLayer;

/**
 * @type {!Array<!API.Client.Image>}
 * @export
 */
API.Client.ProcessedImageData.prototype.latentLayer;

/**
 * @type {!Array<!API.Client.Image>}
 * @export
 */
API.Client.ProcessedImageData.prototype.outputLayer;

