goog.provide('API.Client.Clustering');

/**
 * @record
 */
API.Client.Clustering = function() {}

/**
 * @type {!number}
 * @export
 */
API.Client.Clustering.prototype.minX;

/**
 * @type {!number}
 * @export
 */
API.Client.Clustering.prototype.maxX;

/**
 * @type {!number}
 * @export
 */
API.Client.Clustering.prototype.minY;

/**
 * @type {!number}
 * @export
 */
API.Client.Clustering.prototype.maxY;

/**
 * @type {!number}
 * @export
 */
API.Client.Clustering.prototype.nClusters;

/**
 * @type {!Array<!API.Client.Point2D>}
 * @export
 */
API.Client.Clustering.prototype.points;

