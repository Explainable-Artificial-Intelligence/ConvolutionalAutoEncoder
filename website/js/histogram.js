function Histogram(parentNodeID, width, height) {
    /*
    private functions
     */
    function getPixelData() {
        /*
        extracts the pixel data of the image
         */
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
        return canvas.getContext('2d').getImageData(0, 0, img.width, img.height);
    }

    function generateHistogramData() {
        /*
        creates histogram data
         */

        //delete old histogram data:
        for (var i = 0; i < 256; i++) {
            histogramData.red[i] = 0;
            histogramData.green[i] = 0;
            histogramData.blue[i] = 0;
            // histogramData.alpha[i] = 0;
        }

        for (i = 0; i < pixelData.data.length; i += 4) {
            histogramData.red[pixelData.data[i]]++;
            histogramData.green[pixelData.data[i + 1]]++;
            histogramData.blue[pixelData.data[i + 2]]++;
            // histogramData.alpha[pixelData.data[i + 3]]++;
        }

        // update charts:
        redChannelHist.replaceData(histogramData);
        // greenChannelHist.replaceData(histogramData.green);
        // blueChannelHist.replaceData(histogramData.blue);
        // alphaChannelHist.replaceData(histogramData.alpha);
    }

    /*
    public functions
     */
    this.setImage = function (newImg) {
        img = newImg;
        pixelData = getPixelData();
        // console.log(pixelData);
        generateHistogramData();
        // console.log(histogramData);
    };


    /*
    global variables
     */
    var img;
    var pixelData;
    var histogramData = {
        "red": Array.apply(null, new Array(256)).map(function () {
            return 0;
        }),
        "green": Array.apply(null, new Array(256)).map(function () {
            return 0;
        }),
        "blue": Array.apply(null, new Array(256)).map(function () {
            return 0;
        })
        // "alpha": Array.apply(null, new Array(256)).map(function () {
        //     return 0;
        // })
    };

    // create charts:
    var redChannelHist = new LineChart(parentNodeID, width, height, "red channel", {
        'red': 'red',
        'green': 'lime',
        'blue': 'blue'
        // 'alpha': 'gray'
    });
    // var greenChannelHist = new LineChart(parentNodeID, width, height, "green channel");
    // var blueChannelHist = new LineChart(parentNodeID, width, height, "blue channel");
    // var alphaChannelHist = new LineChart(parentNodeID, width, height, "alpha channel");


}