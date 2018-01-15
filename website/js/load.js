

loadFile = function () {
    //read parameter
    var inputFilePath = document.getElementById("inputFilePath").value;
    var inputDatasetName = document.getElementById("inputDatasetName").value;
    var dataType = document.getElementById("dataType").options[document.getElementById("dataType").selectedIndex].value;
    var readLabels = document.getElementById("readLabels").options[document.getElementById("readLabels").selectedIndex].value;

    // run swagger function:
    API.Client.LoadApi.prototype.loadFile(inputFilePath, inputDatasetName, readLabels, dataType);

};