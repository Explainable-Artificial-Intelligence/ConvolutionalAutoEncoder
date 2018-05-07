/*
class containing a modifiable d3 line chart
 */

/*
Includes
 */

/*
Random test functions
 */

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomArray(min, max, length) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array.push(getRandomIntInclusive(min, max));
    }

    return array;

}

function LineChart(parentNodeID, width, height, xProperty, yProperty, xAxisName, yAxisName, colorScheme) {
    // console.log(this);

    //storage for datapoints:
    var data = [];
    var line = {};
    var logScale = false;

    //set initial min/max values:
    var xmin = 0;
    var xmax = 1;
    var ymin = 0;
    var ymax = 0.0001;


    //create plot pane:
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    //create inner panel:
    var panelWidth = width - 100;
    var panelHeight = height - 50;
    var panel = plot.append("g");
    panel.attr("transform", "translate(52.5, 12.5)")
        .attr("width", panelWidth)
        .attr("height", panelHeight);


    //set Scales
    var xScale = d3.scaleLinear();
    xScale.domain([xmin, xmax]);
    xScale.range([0, panelWidth]);
    var yScale = d3.scaleLinear();
    yScale.domain([ymin * 0.9, ymax * 1.1]);
    yScale.range([panelHeight, 0]);

    //axis:
    var xAxis = d3.axisBottom(xScale).ticks(5);
    var yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".3s")).ticks(5);

    //TODO: move styling in css

    plot.append("g")
        .attr("class", "axis")
        .attr("id", "yAxis")
        .attr("transform", "translate(52.5, 12.5 )")
        .attr("fill", "orange")
        .call(yAxis);

    plot.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(52.5," + (panelHeight + 25) + ")")
        .attr("id", "xAxis")
        .call(xAxis);

    plot.append("text")
        .attr("x", 60)
        .attr("y", 10)
        .attr("font-size", "12px")
        .text(yAxisName)
        .attr("fill", "orange");


    plot.append("text")
        .attr("x", width / 2)
        .attr("y", panelHeight + 40)
        .attr("font-size", "12px")
        .text(xAxisName)
        .attr("fill", "orange");


    // add event listener:
    plot.on("click", function () {
        // get domain and range:
        var domain = yAxis.scale().domain();
        var range = yAxis.scale().range();

        // create new scale:


        if (logScale) {
            // yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".3s")).ticks(5);
            yScale = d3.scaleLinear();

            logScale = false;
        } else {
            // yAxis = d3.axisLeft(yScale).tickFormat(d3.format("e")).ticks(5);
            yScale = d3.scaleLog();

            logScale = true;
        }
        yScale.domain(domain);
        yScale.range(range);

        // update axis
        updateAxis();
        redrawLine();
    });

    //draw line:


    //line helper function
    var lineSegment = d3.line()
        .x(function (d) {
            return xScale(d[xProperty]);
        })
        .y(function (d) {
            return yScale(d[yProperty]);
        });

    function updateAxis() {
        xAxis = d3.axisBottom(xScale).ticks(5);
        if (logScale) {
            yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".1e")).ticks(5);
        } else {
            yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".1s")).ticks(5);
        }
        //panel.select(".x").call(xAxis);
        //panel.select(".y").call(yAxis);
        // update axis
        plot.selectAll(".axis").remove();
        //panel.select("#yAxis").remove();
        plot.append("g")
            .attr("class", "axis")
            .attr("id", "yAxis")
            .attr("transform", "translate(52.5, 12.5 )")
            .attr("fill", "orange")
            .call(yAxis);

        plot.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(52.5," + (panelHeight + 12.5) + ")")
            .attr("id", "xAxis")
            .call(xAxis);

        /*panel.append("g")
            .attr("class", "axis")
            .attr("id", "yAxis")
            .attr("transform", "translate(1,0)")
            .attr("fill", "orange")
            .call(yAxis);

        panel.append("g")
            .attr("class", "axis")
            .attr("id", "xAxis")
            .attr("transform", "translate(0," + (panelHeight - 5) + ")")
            .call(xAxis);*/
    }


    function redrawLine() {
        //remove old line:
        panel.selectAll("path").remove();

        // add new lines
        for (var key in data) {
            line[key] = panel.append('path')
                .datum(data[key])
                .attr('d', lineSegment)
                .attr('stroke', colorScheme[key]);
        }
    }

    function updateChart() {
        //rescale chart:


        // if (ymax < d3.max(data) || ymin > d3.min(data)) {
        //     ymax = d3.max(data);
        //     ymin = d3.min(data);
        //     yScale.domain([ymin * 0.9, ymax * 1.1]);
        // }

        // get min/max of whole dataset:
        ymax = Number.MIN_VALUE;
        ymin = Number.MAX_VALUE;
        xmax = Number.MIN_VALUE;
        xmin = Number.MAX_VALUE;
        for (var key in data) {
            for (var i = 0; i < data[key].length; i++) {
                xmin = Math.min(data[key][i][xProperty], xmin);
                xmax = Math.max(data[key][i][xProperty], xmax);
                ymax = Math.max(data[key][i][yProperty], ymax);
                ymin = Math.min(data[key][i][yProperty], ymin);
            }

        }
        xScale.domain([xmin - 1, xmax + 1]);
        yScale.domain([ymin * 0.9, ymax * 1.1]);

        //update axis
        updateAxis();

        redrawLine();
    }

    this.appendData = function (additionalData) {
        for (var key in additionalData) {
            if (key in data) {
                data[key] = data[key].concat(additionalData[key]);
            } else {
                data[key] = additionalData[key]
            }

        }

        updateChart();

    };

    this.replaceData = function (newData) {
        data = newData;
        updateChart();

    };

    this.getLatestYValue = function (key) {
        // if no key provided return latest value of first line
        if (key === null) {
            return Object.keys(data)[0][Object.keys(data)[0].length - 1][yProperty];
        }
        return data[key][data[key].length - 1][yProperty];
    };
    this.getLatestXValue = function (key) {
        // if no key provided return latest step of first line
        if (key === null) {
            return Object.keys(data)[0][Object.keys(data)[0].length - 1][xProperty];
        }
        return data[key][data[key].length - 1][xProperty];
    };

}

