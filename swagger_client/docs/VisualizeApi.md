# ConvolutionalAutoencoder.VisualizeApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**generateImageFromSinglePoint**](VisualizeApi.md#generateImageFromSinglePoint) | **GET** /visualize/generateImageFromSinglePoint | generates the AE output from a given point of the sample distribution
[**getHiddenLayerLatentClustering**](VisualizeApi.md#getHiddenLayerLatentClustering) | **GET** /visualize/getHiddenLayerLatentClustering | returns the clustering of the latent representation of a hidden layer


<a name="generateImageFromSinglePoint"></a>
# **generateImageFromSinglePoint**
> Image generateImageFromSinglePoint(point2D)

generates the AE output from a given point of the sample distribution



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.VisualizeApi();

var point2D = new ConvolutionalAutoencoder.Point2D(); // Point2D | 2D Point of the sample distribution


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.generateImageFromSinglePoint(point2D, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **point2D** | [**Point2D**](Point2D.md)| 2D Point of the sample distribution | 

### Return type

[**Image**](Image.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getHiddenLayerLatentClustering"></a>
# **getHiddenLayerLatentClustering**
> Clustering getHiddenLayerLatentClustering(opts)

returns the clustering of the latent representation of a hidden layer



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.VisualizeApi();

var opts = { 
  'algorithm': "algorithm_example", // String | determines the clutering algorithm
  'datasetName': "train_data", // String | determines the dataset which should be clustered
  'dimensionReduction': "dimensionReduction_example", // String | determines the algorithm for dim reduction
  'clusterParameters': new ConvolutionalAutoencoder.ClusterParameters(), // ClusterParameters | determines the clutering parameters
  'layer': 56 // Number | determines the hidden layer
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getHiddenLayerLatentClustering(opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **algorithm** | **String**| determines the clutering algorithm | [optional] 
 **datasetName** | **String**| determines the dataset which should be clustered | [optional] [default to train_data]
 **dimensionReduction** | **String**| determines the algorithm for dim reduction | [optional] 
 **clusterParameters** | [**ClusterParameters**](ClusterParameters.md)| determines the clutering parameters | [optional] 
 **layer** | **Number**| determines the hidden layer | [optional] 

### Return type

[**Clustering**](Clustering.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json
