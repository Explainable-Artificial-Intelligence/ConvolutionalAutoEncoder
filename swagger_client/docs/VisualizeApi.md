# ConvolutionalAutoencoder.VisualizeApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**computeHiddenLayerLatentClustering**](VisualizeApi.md#computeHiddenLayerLatentClustering) | **POST** /visualize/computeHiddenLayerLatentClustering | starts the clustering of the latent representation of a hidden layer
[**generateImageFromSinglePoint**](VisualizeApi.md#generateImageFromSinglePoint) | **GET** /visualize/generateImageFromSinglePoint | generates the AE output from a given point of the sample distribution
[**getHiddenLayerLatentClustering**](VisualizeApi.md#getHiddenLayerLatentClustering) | **POST** /visualize/getHiddenLayerLatentClustering | returns the clustering of the latent representation of a hidden layer
[**getPretrainedModelAsZip**](VisualizeApi.md#getPretrainedModelAsZip) | **POST** /visualize/getPretrainedModelAsZip | returns a zip file with the pre trained model as runable python script


<a name="computeHiddenLayerLatentClustering"></a>
# **computeHiddenLayerLatentClustering**
> computeHiddenLayerLatentClustering(algorithm, dimensionReduction, opts)

starts the clustering of the latent representation of a hidden layer

starts the clustering of the latent representation of a hidden layer

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.VisualizeApi();

var algorithm = "algorithm_example"; // String | determines the clutering algorithm

var dimensionReduction = "dimensionReduction_example"; // String | determines the algorithm for dim reduction

var opts = { 
  'datasetName': "train_data", // String | determines the dataset which should be clustered
  'layer': 56, // Number | determines the hidden layer
  'clusterParameters': new ConvolutionalAutoencoder.ClusterParameters() // ClusterParameters | determines the clutering parameters
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.computeHiddenLayerLatentClustering(algorithm, dimensionReduction, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **algorithm** | **String**| determines the clutering algorithm | 
 **dimensionReduction** | **String**| determines the algorithm for dim reduction | 
 **datasetName** | **String**| determines the dataset which should be clustered | [optional] [default to train_data]
 **layer** | **Number**| determines the hidden layer | [optional] 
 **clusterParameters** | [**ClusterParameters**](ClusterParameters.md)| determines the clutering parameters | [optional] 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

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

returns the clustering of the latent representation of a hidden layer

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.VisualizeApi();

var opts = { 
  'datasetName': "train_data", // String | determines the dataset which should be clustered
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
 **datasetName** | **String**| determines the dataset which should be clustered | [optional] [default to train_data]
 **layer** | **Number**| determines the hidden layer | [optional] 

### Return type

[**Clustering**](Clustering.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getPretrainedModelAsZip"></a>
# **getPretrainedModelAsZip**
> File getPretrainedModelAsZip()

returns a zip file with the pre trained model as runable python script



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.VisualizeApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getPretrainedModelAsZip(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

**File**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: multipart/form-data

