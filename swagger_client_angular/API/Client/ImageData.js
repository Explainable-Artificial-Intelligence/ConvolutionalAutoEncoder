goog.provide('API.Client.ImageData');

/**
 * @record
 */
API.Client.ImageData = function() {}

/**
 * @type {!number}
 * @export
 */
API.Client.ImageData.prototype.numImages;

/**
 * @type {!number}
 * @export
 */
API.Client.ImageData.prototype.resX;

/**
 * @type {!number}
 * @export
 */
API.Client.ImageData.prototype.resY;

/**
 * @type {!Array<!API.Client.Image>}
 * @export
 */
API.Client.ImageData.prototype.images;

