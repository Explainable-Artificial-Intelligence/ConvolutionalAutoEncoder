# ConvolutionalAutoencoder.TuneApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**controlTuning**](TuneApi.md#controlTuning) | **PUT** /tune/controlTuning | starts, pauses and stops the tuning
[**getProcessedImageDataOfCurrentTuning**](TuneApi.md#getProcessedImageDataOfCurrentTuning) | **GET** /tune/getProcessedImageDataOfCurrentTuning | returns a subset of the current train images and the corresponding latent representation and output
[**getTrainPerformanceOfCurrentTuning**](TuneApi.md#getTrainPerformanceOfCurrentTuning) | **GET** /tune/getTrainPerformanceOfCurrentTuning | returns the next batch of scalar train variables
[**passANNParameterLists**](TuneApi.md#passANNParameterLists) | **POST** /tune/buildGridSearchANN | passes all learning and ANN parameters to the server


<a name="controlTuning"></a>
# **controlTuning**
> controlTuning(trainStatus)

starts, pauses and stops the tuning



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

<a name="passANNParameterLists"></a>
# **passANNParameterLists**
> passANNParameterLists(inputParameterLists)

passes all learning and ANN parameters to the server

Includes learning parameters and ANN topology as lists

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TuneApi();

var inputParameterLists = new ConvolutionalAutoencoder.ParameterList(); // ParameterList | object with all tunable parameter lists


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.passANNParameterLists(inputParameterLists, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **inputParameterLists** | [**ParameterList**](ParameterList.md)| object with all tunable parameter lists | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

