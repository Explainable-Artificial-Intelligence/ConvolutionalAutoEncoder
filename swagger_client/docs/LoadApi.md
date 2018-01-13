# ConvolutionalAutoencoder.LoadApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getImageBatch**](LoadApi.md#getImageBatch) | **GET** /load/getImageBatch | returns the next batch of input/output images
[**getImageById**](LoadApi.md#getImageById) | **GET** /load/getImageById | returns a single input/output image
[**getImages**](LoadApi.md#getImages) | **GET** /load/getImages | returns a subset of input/output images
[**getRandomImages**](LoadApi.md#getRandomImages) | **GET** /load/getRandomImages | returns the next batch of input/output images
[**loadFile**](LoadApi.md#loadFile) | **POST** /load/loadFile | Load a train/test data file


<a name="getImageBatch"></a>
# **getImageBatch**
> ImageData getImageBatch(opts)

returns the next batch of input/output images

images are encoded as png byte strings

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var opts = { 
  'batchSize': 100, // Number | defines the number of return images
  'datasetname': "train_data", // String | name for dataset on the server
  'sortBy': "sortBy_example", // String | defines the sorting of the input images
  'filter': "filter_example", // String | the values which should be filtered (whitelist)
  'output': false // Boolean | if true returns AE output Images instead of input Images
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getImageBatch(opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batchSize** | **Number**| defines the number of return images | [optional] [default to 100]
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]
 **sortBy** | **String**| defines the sorting of the input images | [optional] 
 **filter** | **String**| the values which should be filtered (whitelist) | [optional] 
 **output** | **Boolean**| if true returns AE output Images instead of input Images | [optional] [default to false]

### Return type

[**ImageData**](ImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getImageById"></a>
# **getImageById**
> ImageData getImageById(id, opts)

returns a single input/output image

images are encoded as png byte strings

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var id = 56; // Number | defines the id of the images

var opts = { 
  'datasetname': "train_data", // String | name for dataset on the server
  'sortBy': "sortBy_example", // String | defines the sorting of the input images
  'filter': "filter_example", // String | the values which should be filtered (whitelist)
  'output': false // Boolean | if true returns AE output Images instead of input Images
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getImageById(id, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **Number**| defines the id of the images | 
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]
 **sortBy** | **String**| defines the sorting of the input images | [optional] 
 **filter** | **String**| the values which should be filtered (whitelist) | [optional] 
 **output** | **Boolean**| if true returns AE output Images instead of input Images | [optional] [default to false]

### Return type

[**ImageData**](ImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getImages"></a>
# **getImages**
> ImageData getImages(startIdx, endIdx, opts)

returns a subset of input/output images

images are encoded as png byte strings

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var startIdx = 0; // Number | name for dataset on the server

var endIdx = 10; // Number | name for dataset on the server

var opts = { 
  'datasetname': "train_data", // String | name for dataset on the server
  'sortBy': "sortBy_example", // String | defines the sorting of the input images
  'filter': "filter_example", // String | the values which should be filtered (whitelist)
  'output': false // Boolean | if true returns AE output Images instead of input Images
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getImages(startIdx, endIdx, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **startIdx** | **Number**| name for dataset on the server | [default to 0]
 **endIdx** | **Number**| name for dataset on the server | [default to 10]
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]
 **sortBy** | **String**| defines the sorting of the input images | [optional] 
 **filter** | **String**| the values which should be filtered (whitelist) | [optional] 
 **output** | **Boolean**| if true returns AE output Images instead of input Images | [optional] [default to false]

### Return type

[**ImageData**](ImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getRandomImages"></a>
# **getRandomImages**
> ImageData getRandomImages(opts)

returns the next batch of input/output images

images are encoded as png byte strings

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var opts = { 
  'batchSize': 100, // Number | defines the number of return images
  'datasetname': "train_data", // String | name for dataset on the server
  'sortBy': "sortBy_example", // String | defines the sorting of the input images
  'filter': "filter_example", // String | the values which should be filtered (whitelist)
  'output': false // Boolean | if true returns AE output Images instead of input Images
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getRandomImages(opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **batchSize** | **Number**| defines the number of return images | [optional] [default to 100]
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]
 **sortBy** | **String**| defines the sorting of the input images | [optional] 
 **filter** | **String**| the values which should be filtered (whitelist) | [optional] 
 **output** | **Boolean**| if true returns AE output Images instead of input Images | [optional] [default to false]

### Return type

[**ImageData**](ImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="loadFile"></a>
# **loadFile**
> loadFile(filename, opts)

Load a train/test data file

Load a data file in different data formats

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var filename = "data/mnist_train_data.npy"; // String | 

var opts = { 
  'datasetname': "train_data", // String | name for dataset on the server
  'readLabels': false, // Boolean | true to read labels
  'dataType': "auto" // String | determines the data format of the input file
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.loadFile(filename, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **filename** | **String**|  | [default to data/mnist_train_data.npy]
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]
 **readLabels** | **Boolean**| true to read labels | [optional] [default to false]
 **dataType** | **String**| determines the data format of the input file | [optional] [default to auto]

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json
