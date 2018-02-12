/*
Functions to create interactive
 */


function createANNLayer(width, height, layerWidth, layerHeight, stackCount, parentNodeID) {
    //create plot pane:
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style('background-color', '#3a3a3a')
        .style('stroke-width', 1);

    //Scales:
    var xScale = d3.scaleLinear();
    xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
    xScale.range([0, width - 20]);
    var yScale = d3.scaleLinear();
    yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);
    yScale.range([0, height - 20]);

    //TODO: move styling to css

    // draw rectangles
    //var rects = [];
    for (var i = 1; i <= stackCount; i++) {
        plot.append("rect")
            .attr('class', 'stack_rect')
            .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
            .attr("y", i * 0.2 * yScale(layerHeight))
            .attr("width", xScale(layerWidth))
            .attr("height", yScale(layerHeight))
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', "orange")
            .style('fill-opacity', 0.3);
        //rects.push(rect);
    }

    // add description:
    var xAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
            ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ')
        //.attr("x", (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)))
        //.attr("y", (stackCount * 0.2 + 1) * yScale(layerHeight) + 15)
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var yAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
            (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)')
        //.attr("x", width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 15)
        //.attr("y", (stackCount * 0.2 + 0.5) * yScale(layerHeight))
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var zAxisDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text('stacks: ' + stackCount);
    var plusButton = plot.append("circle")
        .attr('r', 7)
        .attr('cx', -10)
        .attr("class", "stack_button")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
        .style('stroke-width', 1)
        .style('stroke', "orange")
        .style('fill', '#3a3a3a')
        .text('stacks: ' + stackCount);
    var minusButton = plot.append("circle")
        .attr('r', 7)
        .attr('cx', 10)
        .attr("class", "stack_button")
        .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
        .style('stroke-width', 1)
        .style('stroke', "orange")
        .style('fill', '#3a3a3a')
        .text('stacks: ' + stackCount);

    // print console output:
    console.log("layerWidth: " + layerWidth);
    console.log("last rect x pos: " + ((width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(layerWidth) / 2)));
    console.log("layerWidth scaled: " + xScale(layerWidth));
    console.log("Width text position: " + (xScale(layerWidth) / 2 + 20));

    this.addStack = function () {
        // update stack count
        stackCount += 1;

        // rescale axis:
        xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
        yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);

        // move description
        xAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ');
        yAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
                (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)');
        zAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
                (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
            .text('stacks: ' + stackCount);


        // move existing stacks:
        plot.selectAll(".stack_rect")
            .transition()
            .duration(500)
            .attr("x", function (d, i) {
                return width - xScale(layerWidth) - (i + 1) * 0.2 * xScale(layerWidth);
            })
            .attr("y", function (d, i) {
                return (i + 1) * 0.2 * yScale(layerHeight);
            })
            .attr("width", function (d, i) {
                return xScale(layerWidth);
            })
            .attr("height", function (d, i) {
                return yScale(layerHeight);
            });


        // add additional stack
        plot.append("rect")
            .transition()
            .duration(500)
            .attr('class', 'stack_rect')
            .attr("x", width - xScale(layerWidth) - (stackCount) * 0.2 * xScale(layerWidth))
            .attr("y", (stackCount) * 0.2 * yScale(layerHeight))
            .attr("width", xScale(layerWidth))
            .attr("height", yScale(layerHeight))
            .style('stroke-width', 1)
            .style('stroke', "lightBlue")
            .style('fill', "lightBlue")
            .style('fill-opacity', 0.3)
            // fade out highlight color:
            .transition()
            .duration(1500)
            .style('stroke', "orange")
            .style('fill', "orange");

    }

}

var exampleLayer = new createANNLayer(200, 200, 28, 28, 3, "testCAE");
createANNLayer(200, 200, 28, 28, 2, "testCAE");
createANNLayer(200, 200, 28, 28, 3, "testCAE");
createANNLayer(200, 200, 28, 28, 4, "testCAE");
createANNLayer(200, 200, 28, 28, 6, "testCAE");
createANNLayer(200, 200, 100, 100, 20, "testCAE");

document.getElementById("testBtn").addEventListener("click", function () {
    exampleLayer.addStack();
});