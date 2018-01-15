# ConvolutionalAutoencoder.BuildApi

All URIs are relative to *http://localhost:8080/v2*

Method | HTTP request | Description
------------- | ------------- | -------------
[**buildANN**](BuildApi.md#buildANN) | **POST** /build/buildANN | passes all learning and ANN parameters to the server


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

