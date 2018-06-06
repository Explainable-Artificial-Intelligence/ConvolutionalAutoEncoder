# ConvolutionalAutoencoder.BuildApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**buildANN**](BuildApi.md#buildANN) | **POST** /build/buildANN | passes all learning and ANN parameters to the server
[**getANNParameter**](BuildApi.md#getANNParameter) | **GET** /build/getANNParameter | returns the parameter set of the created ANN
[**getInputShape**](BuildApi.md#getInputShape) | **GET** /build/getInputShape | returns the input shape of the train data


<a name="buildANN"></a>
# **buildANN**
> buildANN(inputParameters)

passes all learning and ANN parameters to the server

Includes learning parameters and ANN topology

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.BuildApi();

var inputParameters = new ConvolutionalAutoencoder.ParameterList(); // ParameterList | object with all tunable parameters


var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
};
apiInstance.buildANN(inputParameters, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **inputParameters** | [**ParameterList**](ParameterList.md)| object with all tunable parameters | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getANNParameter"></a>
# **getANNParameter**
> ParameterList getANNParameter()

returns the parameter set of the created ANN

returns a object of type ParameterList

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.BuildApi();

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getANNParameter(callback);
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**ParameterList**](ParameterList.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="getInputShape"></a>
# **getInputShape**
> [&#39;Number&#39;] getInputShape(opts)

returns the input shape of the train data

returns the input shape of the train data

### Example
```javascript
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var apiInstance = new ConvolutionalAutoencoder.BuildApi();

var opts = { 
  'datasetName': "train_data" // String | name of the dataset
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
apiInstance.getInputShape(opts, callback);
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **datasetName** | **String**| name of the dataset | [optional] [default to train_data]

### Return type

**[&#39;Number&#39;]**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

