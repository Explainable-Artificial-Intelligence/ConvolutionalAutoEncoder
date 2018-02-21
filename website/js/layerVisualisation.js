/*
Functions to create interactive
 */


function createANNLayer(width, height, layerWidth, layerHeight, stackCount, filtersize, parentNodeID,
                        modifiableFiltersize, modifiableStackCount, linkedLayer) {
    //create plot pane:
    var plot = d3.select("#" + parentNodeID)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style('background-color', '#3a3a3a')
        .style('stroke-width', 1);

    //Scales:
    var xScale = d3.scaleLinear();
    xScale.domain([0, layerWidth + 0.2 * Math.max(stackCount, 2) * layerWidth]);
    xScale.range([0, width - 20]);
    var yScale = d3.scaleLinear();
    yScale.domain([0, layerHeight + 0.2 * Math.max(stackCount, 2) * layerHeight]);
    yScale.range([0, height - 20]);

    //helper variables:
    var transitionFinished = true;

    //TODO: move styling to css

    // draw rectangles
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
    }

    // add filter size rect:
    plot.append("rect")
        .attr('class', 'filter_rect')
        .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
        .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
        .attr("width", xScale(filtersize))
        .attr("height", yScale(filtersize))
        .style('stroke-width', 2)
        .style('stroke', "red")
        .style('fill', "red")
        .style('fill-opacity', 0.2);

    // add description:
    var xAxisDescription = plot.append("text")
        .attr("class", "chart_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
            ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var yAxisDescription = plot.append("text")
        .attr("class", "chart_description")
        .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
            (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(layerWidth + "px");
    var stackDescription = plot.append("text")
        .attr("class", "stack_description")
        .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
            (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text('stacks: ' + stackCount);

    // add +/- buttons
    if (modifiableStackCount) {
        var stackPlusButtonGroup = plot.append("g")
            .attr("class", "stack_button")
            .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
            .on('click', function () {
                if (transitionFinished) {
                    if (linkedLayer != null) {
                        linkedLayer.addStack();
                    }
                    addStack();
                }
            });
        stackPlusButtonGroup.append("circle")
            .attr('r', 7)
            .attr('cx', 10)
            .attr("class", "stack_button")
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', '#3a3a3a');

        stackPlusButtonGroup.append('text')
            .attr('x', 10)
            .attr('y', 4)
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text('+')
            .on("mouseover", function (d) {
                d3.select(this).style("cursor", "default");
            });

        var stackMinusButtonGroup = plot.append("g")
            .attr("class", "stack_button")
            .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
            .on('click', function () {
                if (transitionFinished) {
                    if (linkedLayer != null) {
                        linkedLayer.removeStack();
                    }
                    removeStack();
                }
            });
        stackMinusButtonGroup.append("circle")
            .attr('r', 7)
            .attr('cx', -10)
            .attr("class", "stack_button")
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', '#3a3a3a');

        stackMinusButtonGroup.append('text')
            .attr('x', -10)
            .attr('y', 4)
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text('-')
            .on("mouseover", function (d) {
                d3.select(this).style("cursor", "default");
            });
    }


    // add filtersize description and buttons:
    var filtersizeDescription = plot.append("text")
        .attr("class", "filter_description")
        .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 25) + ', ' +
            (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight) - 5) + ') rotate(315)')
        .style('fill', "orange")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text('Filtersize: ' + filtersize);

    // add +/- buttons
    if (modifiableFiltersize) {
        var filterPlusButtonGroup = plot.append("g")
            .attr("class", "filter_button")
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15) + ', ' +
                (((stackCount / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)')
            .on('click', function () {
                if (transitionFinished) {
                    if (linkedLayer != null) {
                        linkedLayer.increaseFiltersize();
                    }
                    increaseFiltersize();
                }
            });
        filterPlusButtonGroup.append("circle")
            .attr('r', 7)
            .attr('cx', 10)
            .attr("class", "filter_button")
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', '#3a3a3a');

        filterPlusButtonGroup.append('text')
            .attr('x', 10)
            .attr('y', 4)
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text('+')
            .on("mouseover", function (d) {
                d3.select(this).style("cursor", "default");
            });

        var filterMinusButtonGroup = plot.append("g")
            .attr("class", "filter_button")
            .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15) + ', ' +
                (((stackCount / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)')
            .on('click', function () {
                if (transitionFinished) {
                    if (linkedLayer != null) {
                        linkedLayer.decreaseFiltersize();
                    }
                    decreaseFiltersize();
                }
            });
        filterMinusButtonGroup.append("circle")
            .attr('r', 7)
            .attr('cx', -10)
            .attr("class", "filter_button")
            .style('stroke-width', 1)
            .style('stroke', "orange")
            .style('fill', '#3a3a3a');

        filterMinusButtonGroup.append('text')
            .attr('x', -10)
            .attr('y', 4)
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text('-')
            .on("mouseover", function (d) {
                d3.select(this).style("cursor", "default");
            });
    }


    // print console output:
    console.log("layerWidth: " + layerWidth);
    console.log("last rect x pos: " + ((width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(layerWidth) / 2)));
    console.log("layerWidth scaled: " + xScale(layerWidth));
    console.log("Width text position: " + (xScale(layerWidth) / 2 + 20));


    function rescaleChart() {
        // rescale Scales:
        xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
        yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);

        // move stack description
        xAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ');
        yAxisDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
                (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)');
        stackDescription.transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
                (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
            .text('stacks: ' + stackCount);


        // move stack +/- buttons:
        if (modifiableStackCount) {
            stackMinusButtonGroup.transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                    (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');
            stackPlusButtonGroup.transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
                    (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');
        }


        // move filtersize description
        filtersizeDescription
            .transition()
            .duration(500)
            .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 25)
                + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight) - 5) + ') rotate(315)');

        // move filtersize +/- buttons:
        if (modifiableFiltersize) {
            filterPlusButtonGroup
                .transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15)
                    + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)');
            filterMinusButtonGroup
                .transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15)
                    + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)');
        }


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

        //move filter rect:
        plot.select(".filter_rect")
            .transition()
            .duration(500)
            .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
            .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
            .attr("width", xScale(filtersize))
            .attr("height", yScale(filtersize));
    }

    function addStack() {
        // start animation
        transitionFinished = false;

        // update stack count
        stackCount += 1;
        rescaleChart();


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
            .duration(500)
            .style('stroke', "orange")
            .style('fill', "orange")
            .on("end", function () {
                transitionFinished = true;
                console.log("transition finished");
            });

    }

    function removeStack() {
        //abort if only on stack left
        if (stackCount < 2) {
            return;
        }

        // start animation
        transitionFinished = false;

        // update stack count
        stackCount -= 1;
        rescaleChart();


        // remove stack
        plot.selectAll('.stack_rect')
            .filter(function (d, i, list) {
                return i === list.length - 1;
            }).transition()
            .duration(500).remove()
            .on("end", function () {
                transitionFinished = true;
                console.log("transition finished");
            });


    }

    function increaseFiltersize() {
        // return if filtersize equals layer size
        if (filtersize === Math.min(layerWidth, layerWidth)) {
            return
        }

        // start animation
        transitionFinished = false;


        // update filtersize
        filtersize += 1;

        filtersizeDescription.text('Filtersize: ' + filtersize);


        if ((Math.min(layerWidth, layerWidth) - filtersize) < 3) {
            plot.select(".filter_rect")
                .transition()
                .duration(500)
                .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth))
                .attr("y", stackCount * 0.2 * yScale(layerHeight))
                .attr("width", xScale(filtersize))
                .attr("height", yScale(filtersize))
                .on("end", function () {
                    transitionFinished = true;
                    console.log("transition finished");
                });
        } else {
            plot.select(".filter_rect")
                .transition()
                .duration(500)
                .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
                .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
                .attr("width", xScale(filtersize))
                .attr("height", yScale(filtersize))
                .on("end", function () {
                    transitionFinished = true;
                    console.log("transition finished");
                });
        }

    }

    function decreaseFiltersize() {
        // return if filtersize already 1
        if (filtersize < 2) {
            return
        }

        // start animation
        transitionFinished = false;

        // update filtersize
        filtersize -= 1;

        filtersizeDescription.text('Filtersize: ' + filtersize);


        if ((Math.min(layerWidth, layerWidth) - filtersize) < 3) {
            plot.select(".filter_rect")
                .transition()
                .duration(500)
                .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth))
                .attr("y", stackCount * 0.2 * yScale(layerHeight))
                .attr("width", xScale(filtersize))
                .attr("height", yScale(filtersize))
                .on("end", function () {
                    transitionFinished = true;
                    console.log("transition finished");
                });
        } else {
            plot.select(".filter_rect")
                .transition()
                .duration(500)
                .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
                .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
                .attr("width", xScale(filtersize))
                .attr("height", yScale(filtersize))
                .on("end", function () {
                    transitionFinished = true;
                    console.log("transition finished");
                });
        }

    }

    function setLayerDimension(newWidth, newHeight) {
        if (newWidth > 0) {
            layerWidth = newWidth;
        }
        if (newHeight > 0) {
            layerHeight = newHeight;
        }

        rescaleChart();
    }


    this.addStack = function () {
        addStack();
    };

    this.removeStack = function () {
        removeStack();
    };

    this.increaseFiltersize = function () {
        increaseFiltersize();
    };

    this.decreaseFiltersize = function () {
        decreaseFiltersize();
    };

    this.setLayerDimension = function (newWidth, newHeight) {
        setLayerDimension(newWidth, newHeight);
    }


}
