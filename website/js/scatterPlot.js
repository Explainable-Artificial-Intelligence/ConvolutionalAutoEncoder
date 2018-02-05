/*
class containing a modifiable d3 line chart
 */

/*
Includes
 */


function ScatterPlot(parentNodeID, width, height, colorMap) {
    console.log(this);

    //storage for datapoints:
    var data = [];
    var points;

    //set initial min/max values:
    var xmin = 0;
    var xmax = 1;
    var ymin = 0;
    var ymax = 1;


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
    xScale.domain([xmin - 10, xmax + 10]);
    xScale.range([0, panelWidth]);
    var yScale = d3.scaleLinear();
    yScale.domain([ymin * 0.9, ymax * 1.1]);
    yScale.range([panelHeight, 0]);

    //axis:
    var xAxis = d3.axisBottom(xScale).ticks(5);
    var yAxis = d3.axisLeft(yScale).ticks(5);

    //TODO: move styling in css

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

    //points helper function
    var lineSegment = d3.line()
        .x(function (d, i) {
            return xScale(i);
        })
        .y(function (d) {
            return yScale(d);
        });

    function updateAxis() {
        xAxis = d3.axisBottom(xScale).ticks(5);
        yAxis = d3.axisLeft(yScale).ticks(5);

        // update axis
        plot.selectAll(".axis").remove();
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
    }


    this.appendData = function (additionalData) {

        data = data.concat(additionalData);

        //rescale chart:
        xmax = data.length;
        xScale.domain([xmin - 1, xmax + 100]);
        if (ymax < d3.max(data) || ymin > d3.min(data)) {
            ymax = d3.max(data);
            ymin = d3.min(data);
            yScale.domain([ymin * 0.9, ymax * 1.1]);
        }

        //update axis
        updateAxis();

        //remove old points:
        panel.selectAll(".points").remove();

        // add new points
        points = panel.append('.points')
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("r", 3.5)
            .attr("cx", function (d) {
                return xScale(d.x);
            })
            .attr("cy", function (d) {
                return yScale(d.y)
            })
            .style("fill", function (d) {
                return colorMap[d.cluster];
            });

    }
}

