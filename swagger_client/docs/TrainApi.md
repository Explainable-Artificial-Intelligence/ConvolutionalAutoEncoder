# ConvolutionalAutoencoder.TrainApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**controlTraining**](TrainApi.md#controlTraining) | **POST** /train/controlTraining | starts, pauses and stops the training
[**getProcessedImageData**](TrainApi.md#getProcessedImageData) | **GET** /train/getProcessedImageData | returns a subset of the current train images and the corresponding latent representation and output
[**getTrainPerformance**](TrainApi.md#getTrainPerformance) | **GET** /train/getTrainPerformance | returns the next batch of scalar train variables


<a name="controlTraining"></a>
# **controlTraining**
> controlTraining(trainStatus, opts)

starts, pauses and stops the training

uses a string enum

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TrainApi();

var trainStatus = new ConvolutionalAutoencoder.TrainStatus(); // TrainStatus | new status for training

var opts = { 
  'datasetName': "datasetName_example" // String | determines data set for training
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.controlTraining(trainStatus, opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **trainStatus** | [**TrainStatus**](TrainStatus.md)| new status for training | 
 **datasetName** | **String**| determines data set for training | [optional] 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getProcessedImageData"></a>
# **getProcessedImageData**
> ProcessedImageData getProcessedImageData(setSize)

returns a subset of the current train images and the corresponding latent representation and output



### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TrainApi();

var setSize = 56; // Number | size of the image subset


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getProcessedImageData(setSize, callback);
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

<a name="getTrainPerformance"></a>
# **getTrainPerformance**
> TrainPerformance getTrainPerformance()

returns the next batch of scalar train variables

as list of dicts

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.TrainApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getTrainPerformance(callback);
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

