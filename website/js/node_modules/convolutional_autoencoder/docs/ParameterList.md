# ConvolutionalAutoencoder.ParameterList

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**inputShape** | **[[Number]]** |  | [optional] 
**numberOfStacks** | **[[Number]]** |  | [optional] 
**filterSizes** | **[[Number]]** |  | [optional] 
**mirrorWeights** | **[Boolean]** |  | [optional] 
**activationFunction** | **[String]** |  | [optional] 
**batchSize** | **[Number]** |  | [optional] 
**nEpochs** | **[Number]** |  | [optional] 
**useTensorboard** | **Boolean** |  | [optional] [default to true]
**verbose** | **Boolean** |  | [optional] [default to true]
**learningRateDict** | [**[LearningRate]**](LearningRate.md) |  | [optional] 
**costFunctionDict** | [**[CostFunction]**](CostFunction.md) |  | [optional] 
**optimizer** | **[String]** |  | [optional] 
**momentum** | **[Number]** |  | [optional] 
**randomWeightsDict** | [**[RandomFunction]**](RandomFunction.md) |  | [optional] 
**randomBiasesDict** | [**[RandomFunction]**](RandomFunction.md) |  | [optional] 
**sessionSaverPath** | **String** |  | [optional] [default to &#39;./save/&#39;]
**loadPrevSession** | **Boolean** |  | [optional] [default to false]
**sessionSaveDuration** | **[Number]** |  | [optional] 
**numTestPictures** | **[Number]** |  | [optional] 


