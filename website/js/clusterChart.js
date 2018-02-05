/*
class containing a modifiable d3 line chart
 */

/*
Includes
 */

function ClusterChart(parentNodeID, width, height, colorMap, clustering) {
    console.log(this);

    //storage for datapoints:
    var data = [];
    var points;

    //set initial min/max values:
    var xmin = clustering.minX;
    var xmax = clustering.maxX;
    var ymin = clustering.minY;
    var ymax = clustering.maxY;

    console.log(clustering);


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
    yScale.domain([ymin, ymax]);
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

    // add new points
    points = panel.selectAll('.points')
        .data(clustering.points)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 1)
        .attr("cx", function (d) {
            return xScale(d.x);
        })
        .attr("cy", function (d) {
            return yScale(d.y)
        })
        .attr("id", function (d, i) {
            return i
        })
        .style("fill", function (d) {
            return colorMap[d.cluster];
        })
        // add zoom on hover
        .on("mouseover", function (d) {
            d3.select(this)
                .transition()
                .duration(20)
                .attr("r", 3);
        })
        .on("mouseout", function (d) {
            d3.select(this)
                .transition()
                .duration(20)
                .attr("r", 1);
        })
        // add on click function for preview
        .on("click", function () {
            var id = d3.select(this).attr("id");
            console.log(id);
            updatePreviewImages(id);
        });


}

