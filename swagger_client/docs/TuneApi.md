# ConvolutionalAutoencoder.TuneApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**applySpecificTuningAsDefaultModel**](TuneApi.md#applySpecificTuningAsDefaultModel) | **POST** /tune/applySpecificTuningAsDefaultModel | sets a given tuned model as default model
[**buildGridSearchANN**](TuneApi.md#buildGridSearchANN) | **POST** /tune/buildGridSearchANN | passes all learning and ANN parameters to the server
[**controlTuning**](TuneApi.md#controlTuning) | **POST** /tune/controlTuning | starts, pauses and stops the tuning
[**getProcessedImageDataOfCurrentTuning**](TuneApi.md#getProcessedImageDataOfCurrentTuning) | **GET** /tune/getProcessedImageDataOfCurrentTuning | returns a subset of the current train images and the corresponding latent representation and output
[**getProcessedImageDataOfSpecificTuning**](TuneApi.md#getProcessedImageDataOfSpecificTuning) | **GET** /tune/getProcessedImageDataOfSpecificTuning | returns a subset of the current train images and the corresponding latent representation and output
[**getTrainPerformanceOfCurrentTuning**](TuneApi.md#getTrainPerformanceOfCurrentTuning) | **GET** /tune/getTrainPerformanceOfCurrentTuning | returns the next batch of scalar train variables
[**getTrainPerformanceOfSpecificTuning**](TuneApi.md#getTrainPerformanceOfSpecificTuning) | **GET** /tune/getTrainPerformanceOfSpecificTuning | returns the complete set of scalar train variables to a given model
[**getTuneModelIds**](TuneApi.md#getTuneModelIds) | **GET** /tune/getTuneModelIds | returns a list of all tuned model ids
[**getTuneParameter**](TuneApi.md#getTuneParameter) | **GET** /tune/getTuneParameter | returns the parameter set of the ANN with the given model id
[**getTunedModelAsZip**](TuneApi.md#getTunedModelAsZip) | **GET** /tune/getTunedModelAsZip | returns a zip file with the pre trained model as runable python script


<a name="applySpecificTuningAsDefaultModel"></a>
# **applySpecificTuningAsDefaultModel**
> applySpecificTuningAsDefaultModel(modelId)

sets a given tuned model as default model

sets a given tuned model as default model

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var modelId = "modelId_example"; // String | model id of the tuned model


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.applySpecificTuningAsDefaultModel(modelId, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelId** | **String**| model id of the tuned model | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="buildGridSearchANN"></a>
# **buildGridSearchANN**
> buildGridSearchANN(inputParameterLists, opts)

passes all learning and ANN parameters to the server

Includes learning parameters and ANN topology as lists

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var inputParameterLists = new ConvolutionalAutoencoder.ParameterList(); // ParameterList | object with all tunable parameter lists

var opts = { 
  'deletePreviousModels': false // Boolean | if true delete all previous tuned models
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.buildGridSearchANN(inputParameterLists, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **inputParameterLists** | [**ParameterList**](ParameterList.md)| object with all tunable parameter lists | 
 **deletePreviousModels** | **Boolean**| if true delete all previous tuned models | [optional] [default to false]

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="controlTuning"></a>
# **controlTuning**
> controlTuning(trainStatus)

starts, pauses and stops the tuning

uses a string enum

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var trainStatus = new ConvolutionalAutoencoder.TrainStatus(); // TrainStatus | new status for training


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.controlTuning(trainStatus, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **trainStatus** | [**TrainStatus**](TrainStatus.md)| new status for training | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getProcessedImageDataOfCurrentTuning"></a>
# **getProcessedImageDataOfCurrentTuning**
> ProcessedImageData getProcessedImageDataOfCurrentTuning(setSize)

returns a subset of the current train images and the corresponding latent representation and output



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var setSize = 56; // Number | size of the image subset


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getProcessedImageDataOfCurrentTuning(setSize, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **setSize** | **Number**| size of the image subset | 

### Return type

[**ProcessedImageData**](ProcessedImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getProcessedImageDataOfSpecificTuning"></a>
# **getProcessedImageDataOfSpecificTuning**
> ProcessedImageData getProcessedImageDataOfSpecificTuning(setSize, modelId)

returns a subset of the current train images and the corresponding latent representation and output



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var setSize = 56; // Number | size of the image subset

var modelId = "modelId_example"; // String | model id of the exspected parameter set


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getProcessedImageDataOfSpecificTuning(setSize, modelId, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **setSize** | **Number**| size of the image subset | 
 **modelId** | **String**| model id of the exspected parameter set | 

### Return type

[**ProcessedImageData**](ProcessedImageData.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getTrainPerformanceOfCurrentTuning"></a>
# **getTrainPerformanceOfCurrentTuning**
> TrainPerformance getTrainPerformanceOfCurrentTuning()

returns the next batch of scalar train variables

as list of dicts

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTrainPerformanceOfCurrentTuning(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**TrainPerformance**](TrainPerformance.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getTrainPerformanceOfSpecificTuning"></a>
# **getTrainPerformanceOfSpecificTuning**
> TrainPerformance getTrainPerformanceOfSpecificTuning(modelId)

returns the complete set of scalar train variables to a given model

as list of dicts

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var modelId = "modelId_example"; // String | model id of the exspected parameter set


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTrainPerformanceOfSpecificTuning(modelId, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelId** | **String**| model id of the exspected parameter set | 

### Return type

[**TrainPerformance**](TrainPerformance.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getTuneModelIds"></a>
# **getTuneModelIds**
> [&#39;String&#39;] getTuneModelIds()

returns a list of all tuned model ids

returns a list of all tuned model ids

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTuneModelIds(callback);
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

<a name="getTuneParameter"></a>
# **getTuneParameter**
> ParameterList getTuneParameter(modelId)

returns the parameter set of the ANN with the given model id

returns a object of type ParameterList

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var modelId = "modelId_example"; // String | model id of the exspected parameter set


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTuneParameter(modelId, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelId** | **String**| model id of the exspected parameter set | 

### Return type

[**ParameterList**](ParameterList.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getTunedModelAsZip"></a>
# **getTunedModelAsZip**
> File getTunedModelAsZip(modelId)

returns a zip file with the pre trained model as runable python script



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var modelId = "modelId_example"; // String | model id of the tuned model


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTunedModelAsZip(modelId, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **modelId** | **String**| model id of the tuned model | 

### Return type

**File**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/octet-stream

