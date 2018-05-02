# ConvolutionalAutoencoder.LoadApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getAvailableDataSets**](LoadApi.md#getAvailableDataSets) | **GET** /load/getAvailableDataSets | get available data sets
[**getImageBatch**](LoadApi.md#getImageBatch) | **GET** /load/getImageBatch | returns the next batch of input/output images
[**getImageById**](LoadApi.md#getImageById) | **GET** /load/getImageById | returns a single input/output image
[**getImages**](LoadApi.md#getImages) | **GET** /load/getImages | returns a subset of input/output images
[**getLatentRepresentationById**](LoadApi.md#getLatentRepresentationById) | **GET** /load/getLatentRepresentationById | returns a single latent representation as ()list of) png images
[**getLoadedDataSets**](LoadApi.md#getLoadedDataSets) | **GET** /load/getLoadedDataSets | get loaded data sets
[**getRandomImages**](LoadApi.md#getRandomImages) | **GET** /load/getRandomImages | returns the next batch of input/output images
[**loadFile**](LoadApi.md#loadFile) | **POST** /load/loadFile | Load a train/test data file
[**resetAllBatchIndices**](LoadApi.md#resetAllBatchIndices) | **POST** /load/resetAllBatchIndices | resets all batch indices of all image sets
[**resetBatchIndex**](LoadApi.md#resetBatchIndex) | **POST** /load/resetBatchIndex | resets the batch index of the image set
[**uploadFile**](LoadApi.md#uploadFile) | **POST** /load/uploadFile | uploads a data file


<a name="getAvailableDataSets"></a>
# **getAvailableDataSets**
> [&#39;String&#39;] getAvailableDataSets()

get available data sets

returns a list of available data set files

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getAvailableDataSets(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

**[&#39;String&#39;]**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

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

<a name="getLatentRepresentationById"></a>
# **getLatentRepresentationById**
> ImageData getLatentRepresentationById(id, opts)

returns a single latent representation as ()list of) png images

images are encoded as png byte strings

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var id = 56; // Number | defines the id of the images

var opts = { 
  'datasetname': "train_data" // String | name for dataset on the server
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getLatentRepresentationById(id, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **Number**| defines the id of the images | 
 **datasetname** | **String**| name for dataset on the server | [optional] [default to train_data]

### Return type

[**ImageData**](ImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getLoadedDataSets"></a>
# **getLoadedDataSets**
> [&#39;String&#39;] getLoadedDataSets()

get loaded data sets

returns a list of loaded data sets

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getLoadedDataSets(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

**[&#39;String&#39;]**

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

<a name="resetAllBatchIndices"></a>
# **resetAllBatchIndices**
> resetAllBatchIndices()

resets all batch indices of all image sets

resets all batch indices of all image sets

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.resetAllBatchIndices(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="resetBatchIndex"></a>
# **resetBatchIndex**
> resetBatchIndex(opts)

resets the batch index of the image set

resets the batch index of the image set

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var opts = { 
  'datasetName': "train_data", // String | name for dataset on the server
  'output': false // Boolean | reset output image batch index instead of input images
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.resetBatchIndex(opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **datasetName** | **String**| name for dataset on the server | [optional] [default to train_data]
 **output** | **Boolean**| reset output image batch index instead of input images | [optional] [default to false]

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="uploadFile"></a>
# **uploadFile**
> uploadFile(upfile)

uploads a data file

Load a data file in different data formats

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.LoadApi();

var upfile = "/path/to/file.txt"; // File | The file to upload.


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.uploadFile(upfile, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **upfile** | **File**| The file to upload. | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: Not defined

