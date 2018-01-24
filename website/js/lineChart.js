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

function LineChart(parentNodeID, width, height, yAxisName) {
    console.log(this);

    //storage for datapoints:
    var data = [];
    var step = 0;


    //create plot pane:
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    //create inner panel:
    var panelWidth = width - 50;
    var panelHeight = height - 50;
    var panel = plot.append("svg");
    panel.attr("transform", "translate(12.5, 12.5)")
        .attr("width", panelWidth)
        .attr("height", panelHeight);


    //set initial min/max values:
    var xmin = 0;
    var xmax = 1;
    var ymin = 0;
    var ymax = 1;

    //set Scales
    var xScale = d3.scaleLinear();
    xScale.domain([xmin - 10, xmax + 10]);
    xScale.range([0, panelWidth]);
    var yScale = d3.scaleLinear();
    yScale.domain([ymin * 0.9, ymax * 1.1]);
    yScale.range([panelHeight, 0]);

    //axis:
    var xAxis = d3.axisBottom(xScale);
    var yAxis = d3.axisLeft(yScale);

    //TODO: move styling in css
    panel.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);
    plot.append("text")
        .attr("x", 10)
        .attr("y", 10)
        .attr("font-size", "12px")
        .text(yAxisName)
        .attr("fill", "orange");

    panel.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (panelHeight - 5) + ")")
        .call(xAxis);
    plot.append("text")
        .attr("x", panelWidth / 2)
        .attr("y", panelHeight + 15)
        .attr("font-size", "12px")
        .text("steps")
        .attr("fill", "orange");

    //draw points:
    var points;
    /* var points = panel.selectAll(".points")
         .data(data)
         .enter()
         .append("circle")
         .attr("r", 3.5)
         .attr("cx", function (d) {
             return xScale(step++);
         })
         .attr("cy", function (d) {
             return yScale(d);
         })
         .style("fill", "orange");*/


    this.appendData = function (additionalData) {
        //append random data
        //additionalData = generateRandomArray(0, 1350, 44);

        data = data.concat(additionalData);

        //rescale chart:
        xmax = data.length;
        xScale.domain([xmin - 1, xmax + 100]);
        if (ymax < d3.max(data) || ymin > d3.min(data)) {
            ymax = d3.max(data);
            ymin = d3.min(data);
            yScale.domain([(ymin - 5) * 0.9, ymax * 1.1]);
        }
        console.log([ymin - 100, ymax * 1.1]);

        //remove old points:
        panel.selectAll("circle").remove();

        /*//update old points
        points.data(data)
            .transition()
            .duration(1000)
            .attr("r", 3.5)
            .attr("cx", function (d, i) {
                //console.log(i);
                return xScale(i);
            })
            .attr("cy", function (d) {
                return yScale(d);
            })
            .style("fill", "red");*/

        //console.log(points);

        // add new points
        points = panel.selectAll(".points")
            .append()
            .data(data)
            .enter()
            .append("circle")
            .attr("r", 1.5)
            .attr("cx", function (d, i) {
                return xScale(i);
            })
            .attr("cy", function (d) {
                return yScale(d);
            })
            .style("fill", "orange");
        //console.log(step);

        //points = panel.selectAll(".points");


        //console.log(data);
    }
    /*//create scales
    var xScale = scaleAxis(data, xColumnName, panelWidth - 150, false);
    var yScale = scaleAxis(data, yColumnName, panelHeight, true);

    // get color scheme
    var colorLabels = new Set(data.map(function (d) {
        return d[colorColumn];
    }));

    var colorMap = getColorScheme(colorLabels);
    generateDataPoints(panel, data, xScale, xColumnName, yScale, yColumnName, rScale, sizeColumnName, colorMap,
        colorColumn, labelColumn);
    if (showAlwaysLabels){
        generateLabels(panel, data, xScale, xColumnName, yScale, yColumnName, rScale, sizeColumnName, labelColumn);
    }



    generateAxis(xScale, yScale, panel, plot, yColumnName, xColumnName, panelHeight, panelWidth);

    generateLegend(colorMap, panel, panelWidth, [3, 4, 6, 8, 12], rScale);*/

}

