/*
Global variables
 */
var encoderDecoderLayerPairs = [];
var inputOutputLayerPair = null;
var annLayerPreview = new ANNLayerPreview(500, 500, 28, 28, 3, 3, true, false, null);

annLayerPreview.setStackCount(0);


/*
Functions to create interactive ANN layer
 */

function ANNLayerPreview(width, height, layerWidth, layerHeight, stackCount, filtersize,
                         modifiableFiltersize, modifiableStackCount, linkedLayer) {
    //create plot pane:
    var plot = d3.select("#layerPreview")
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

    //helper variables:
    var transitionFinished = true;
    var linkedLayer = null;

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
        .attr('transform', 'translate(' + (width - (( stackCount / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
            (((stackCount / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
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
        .attr('transform', 'translate(' + (width - (( stackCount / 2.0) * 0.2 + 1) * xScale(layerWidth) - 25) + ', ' +
            (((stackCount / 2.0) * 0.2) * yScale(layerHeight) - 5) + ') rotate(315)')
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

        // update linked layer
        if (linkedLayer !== null) {
            linkedLayer.addStack();
        }

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

        // update linked layer
        if (linkedLayer !== null) {
            linkedLayer.removeStack();
        }
    }

    function setStackCount(newStackCount) {
        if (newStackCount === stackCount || newStackCount < 1) {
            console.log("Invalid stack count");
            return;
        }

        // start animation
        transitionFinished = false;
        if (newStackCount > stackCount) {
            // increase stack count:
            for (var i = stackCount; i < newStackCount; i++) {
                // add additional stack
                plot.append("rect")
                    .attr('class', 'stack_rect')
                    .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
                    .attr("y", i * 0.2 * yScale(layerHeight))
                    .attr("width", xScale(layerWidth))
                    .attr("height", yScale(layerHeight))
                    .style('stroke-width', 1)
                    .style('fill-opacity', 0.3)
                    .style('stroke', "orange")
                    .style('fill', "orange");
            }

            stackCount = newStackCount;
            rescaleChart();

            // finish animation
            transitionFinished = true;

        } else {
            // start animation
            transitionFinished = false;
            // decrease stack count:
            for (var i = newStackCount; i < stackCount; i++) {
                // remove stack
                plot.selectAll('.stack_rect')
                    .filter(function (d, i, list) {
                        return i === list.length - 1;
                    })
                    .remove();

            }
            stackCount = newStackCount;
            rescaleChart();

            // update linked layer
            if (linkedLayer !== null) {
                linkedLayer.setStackCount(newStackCount);
            }

            // finish animation
            transitionFinished = true;
        }

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

        // update linked layer
        if (linkedLayer !== null) {
            console.log(linkedLayer);
            linkedLayer.increaseFiltersize();
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
        // update linked layer
        if (linkedLayer !== null) {
            console.log(linkedLayer);
            linkedLayer.decreaseFiltersize();
        }

    }

    function setFiltersize(newFiltersize) {
        // return if new filtersize is greater than layer size
        if (newFiltersize > Math.min(layerWidth, layerWidth) || newFiltersize < 1) {
            console.log("Invalid filter size");
            return
        }

        // start animation
        transitionFinished = false;


        // update filtersize
        filtersize = newFiltersize;

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
        // update linked layer
        if (linkedLayer !== null) {
            console.log(linkedLayer);
            linkedLayer.setFiltersize(newFiltersize);
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

    this.setLinkedLayer = function (layerIdx) {
        if (layerIdx > 0) {
            linkedLayer = encoderDecoderLayerPairs[layerIdx - 1];
        }
        if (layerIdx === 0) {
            linkedLayer = inputOutputLayerPair;
        }

        // set current layer values:
        setFiltersize(linkedLayer.getFiltersize());
        setStackCount(linkedLayer.getStackCount());

    };

    this.setStackCount = function (newStackCount) {
        setStackCount(newStackCount);
    }

    this.setFiltersize = function (newFiltersize) {
        setFiltersize(newFiltersize);
    }


}

function ANNLayerPair(width, height, layerWidth, layerHeight, stackCount, filtersize, layerType, linkedLayer) {
    //create plot pane pair:
    var layerPair = [];


    //define basic parameters
    if (layerType === "input_output_layer") {
        var layerIdx = 0;
        layerPair.push({plot_id: "input_layer", title: "Input Layer ", parentNode: "#input", layerIdx: 0});
        layerPair.push({plot_id: "output_layer", title: "Output Layer ", parentNode: "#output", layerIdx: 0});


    } else {
        var layerIdx = (encoderDecoderLayerPairs.length + 1);
        layerPair.push({
            plot_id: "encoder_layer_" + layerIdx,
            title: "Encoder Layer " + layerIdx,
            parentNode: "#encoder",
            layerIdx: layerIdx
        });
        layerPair.push({
            plot_id: "decoder_layer_" + layerIdx,
            title: "Decoder Layer " + layerIdx,
            parentNode: "#decoder",
            layerIdx: layerIdx
        });
    }

    //create plots:
    layerPair[0].plot = d3.select(layerPair[0].parentNode).append("svg");
    layerPair[1].plot = d3.select(layerPair[1].parentNode).insert("svg", "svg");

    layerPair.forEach(function (entry) {
        entry.plot.attr("id", entry.plot_id)
            .attr("width", width)
            .attr("height", height + 30)
            .style('background-color', '#3a3a3a')
            .style('stroke-width', 1)
            .on("click", toggleSelection)
            .on("mouseover", showDeleteButton)
            .on("mouseout", hideDeleteButton);
    });

    //Scales:
    var xScale = d3.scaleLinear();
    xScale.domain([0, layerWidth + 0.2 * Math.max(stackCount, 2) * layerWidth]);
    xScale.range([0, width - 20]);
    var yScale = d3.scaleLinear();
    yScale.domain([0, layerHeight + 0.2 * Math.max(stackCount, 2) * layerHeight]);
    yScale.range([0, height - 20]);

    //helper variables:
    var transitionFinished = true;
    var selected = false;

    //TODO: move styling to css

    layerPair.forEach(function (entry) {
        // add border
        entry.border = entry.plot.append("rect")
            .attr("class", "border_rect")
            .attr("width", width)
            .attr("height", height + 30)
            .style('stroke-width', 0)
            .style('fill', "none")
            .style('stroke', "orange");

        // draw rectangles
        for (var i = 1; i <= stackCount; i++) {
            entry.plot.append("rect")
                .attr('class', 'stack_rect')
                .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
                .attr("y", i * 0.2 * yScale(layerHeight) + 10)
                .attr("width", xScale(layerWidth))
                .attr("height", yScale(layerHeight))
                .style('stroke-width', 1)
                .style('stroke', "orange")
                .style('fill', "orange")
                .style('fill-opacity', 0.3);
        }

        // add filter size rect:
        entry.filterRect = entry.plot.append("rect")
            .attr('class', 'filter_rect')
            .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
            .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3) + 10)
            .attr("width", xScale(filtersize))
            .attr("height", yScale(filtersize))
            .style('stroke-width', 2)
            .style('stroke', "red")
            .style('fill', "red")
            .style('fill-opacity', 0.2);

        // add delete button:
        if (layerType !== "input_output_layer") {
            // add delete button:
            entry.deleteBtnBorder = entry.plot.append("rect")
                .attr('class', 'delete_button')
                .attr("x", width - 15)
                .attr("y", 2)
                .style('fill', "orange")
                .text("x")
                .attr("width", 13)
                .attr("height", 13)
                .style('stroke-width', 1)
                .style('stroke', "orange")
                .style('fill', "none")
                .style('fill-opacity', 0.2)
                .on("click", function () {
                    d3.select("#encoder_layer_" + layerIdx).remove();
                    d3.select("#decoder_layer_" + layerIdx).remove();
                });
            entry.deleteBtn = entry.plot.append("text")
                .attr("class", "delete_button")
                .attr("x", width - 12)
                .attr("y", 12)
                .style('fill', "orange")
                .text("x")
                .on("click", function () {
                    d3.select("#encoder_layer_" + layerIdx).remove();
                    d3.select("#decoder_layer_" + layerIdx).remove();
                });
        }

        // add title:
        entry.titleDescription = entry.plot.append("text")
            .attr("class", "title_description")
            .attr('transform', 'translate(' + (width / 2.0) + ', 15)')
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "15px")
            .text(entry.title);

        // add stack description:
        entry.stackDescription = entry.plot.append("text")
            .attr("class", "stack_description")
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                ((stackCount * 0.2 + 1) * yScale(layerHeight) + 25) + ') ')
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text('stacks: ' + stackCount);

        // add filtersize description
        entry.filtersizeDescription = entry.plot.append("text")
            .attr("class", "filter_description")
            .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                ((stackCount * 0.2 + 1) * yScale(layerHeight) + 40) + ') ')
            .style('fill', "orange")
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .text('Filtersize: ' + filtersize);

        // // print console output:
        // console.log("layerWidth: " + layerWidth);
        // console.log("last rect x pos: " + ((width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(layerWidth) / 2)));
        // console.log("layerWidth scaled: " + xScale(layerWidth));
        // console.log("Width text position: " + (xScale(layerWidth) / 2 + 20));

    });

    //apply standard layout:
    hideDeleteButton();

    function rescaleChart() {
        // rescale Scales:
        xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
        yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);

        layerPair.forEach(function (entry) {
            // move stack description
            entry.stackDescription.transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                    ((stackCount * 0.2 + 1) * yScale(layerHeight) + 25) + ') ')
                .text('stacks: ' + stackCount);

            // move filtersize description
            entry.filtersizeDescription
                .transition()
                .duration(500)
                .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
                    ((stackCount * 0.2 + 1) * yScale(layerHeight) + 40) + ') ');

            // move existing stacks:
            entry.plot.selectAll(".stack_rect")
                .transition()
                .duration(500)
                .attr("x", function (d, i) {
                    return width - xScale(layerWidth) - (i + 1) * 0.2 * xScale(layerWidth);
                })
                .attr("y", function (d, i) {
                    return (i + 1) * 0.2 * yScale(layerHeight) + 10;
                })
                .attr("width", function (d, i) {
                    return xScale(layerWidth);
                })
                .attr("height", function (d, i) {
                    return yScale(layerHeight);
                });

            //move filter rect:
            entry.plot.select(".filter_rect")
                .transition()
                .duration(500)
                .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
                .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3) + 10)
                .attr("width", xScale(filtersize))
                .attr("height", yScale(filtersize));
        });
    }

    function addStack() {
        // start animation
        transitionFinished = false;

        // update stack count
        stackCount += 1;
        rescaleChart();

        // add additional stack
        layerPair.forEach(function (entry) {
            entry.plot.append("rect")
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
        layerPair.forEach(function (entry) {
            entry.plot.selectAll('.stack_rect')
                .filter(function (d, i, list) {
                    return i === list.length - 1;
                }).transition()
                .duration(500).remove()
                .on("end", function () {
                    transitionFinished = true;
                    console.log("transition finished");
                });
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
        console.log(filtersize);

        layerPair.forEach(function (entry) {
            entry.filtersizeDescription.text('Filtersize: ' + filtersize);
            if ((Math.min(layerWidth, layerHeight) - filtersize) < 3) {
                entry.plot.select(".filter_rect")
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
                entry.plot.select(".filter_rect")
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
        });
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

        layerPair.forEach(function (entry) {
            entry.filtersizeDescription.text('Filtersize: ' + filtersize);

            if ((Math.min(layerWidth, layerHeight) - filtersize) < 3) {
                entry.plot.select(".filter_rect")
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
                entry.plot.select(".filter_rect")
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
        });
    }

    function setFiltersize(newFiltersize) {
        // return if new filtersize is greater than layer size
        if (newFiltersize > Math.min(layerWidth, layerWidth) || newFiltersize < 1) {
            console.log("Invalid filter size");
            return
        }

        // start animation
        transitionFinished = false;

        // update filtersize
        filtersize = newFiltersize;

        layerPair.forEach(function (entry) {
            entry.filtersizeDescription.text('Filtersize: ' + filtersize);

            if ((Math.min(layerWidth, layerHeight) - filtersize) < 3) {
                entry.plot.select(".filter_rect")
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
                entry.plot.select(".filter_rect")
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
        });
    }

    function setStackCount(newStackCount) {
        if (newStackCount === stackCount || newStackCount < 1) {
            console.log("Invalid stack count");
            return;
        }

        layerPair.forEach(function (entry) {
            // start animation
            transitionFinished = false;
            if (newStackCount > stackCount) {
                // increase stack count:
                for (var i = stackCount; i < newStackCount; i++) {
                    // add additional stack
                    entry.plot.append("rect")
                        .attr('class', 'stack_rect')
                        .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
                        .attr("y", i * 0.2 * yScale(layerHeight))
                        .attr("width", xScale(layerWidth))
                        .attr("height", yScale(layerHeight))
                        .style('stroke-width', 1)
                        .style('fill-opacity', 0.3)
                        .style('stroke', "orange")
                        .style('fill', "orange");
                }
            } else {
                // start animation
                transitionFinished = false;
                // decrease stack count:
                for (var i = newStackCount; i < stackCount; i++) {
                    // remove stack
                    entry.plot.selectAll('.stack_rect')
                        .filter(function (d, i, list) {
                            return i === list.length - 1;
                        })
                        .remove();
                }
            }
        });

        stackCount = newStackCount;
        rescaleChart();

        // finish animation
        transitionFinished = true;
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

    function toggleSelection() {
        //(de-)select other layers:
        deselectAllLayers();

        //(de-)select this layer:
        if (selected) {
            layerPair.forEach(function (entry) {
                entry.border.style("stroke-width", 0);
            });
            selected = false;
        } else {
            layerPair.forEach(function (entry) {
                entry.border.style("stroke-width", 2);
            });
            selected = true;
            annLayerPreview.setLinkedLayer(layerIdx);
        }
    }

    function showDeleteButton() {
        if (layerType !== "input_output_layer") {
            layerPair.forEach(function (entry) {
                entry.deleteBtnBorder
                    .transition()
                    .duration(200)
                    .style('opacity', 1.0);
                entry.deleteBtn
                    .transition()
                    .duration(500)
                    .style('opacity', 1.0)
            });
        }
    }

    function hideDeleteButton() {
        if (layerType !== "input_output_layer") {
            layerPair.forEach(function (entry) {
                entry.deleteBtnBorder
                    .transition()
                    .duration(200)
                    .style('opacity', 0.0);
                entry.deleteBtn
                    .transition()
                    .duration(500)
                    .style('opacity', 0.0)
            });
        }

    }

    this.toggleSelection = function () {
        //(de-)select this layer:
        if (selected) {
            border.style("stroke-width", 0);
            selected = false;
        } else {
            border.style("stroke-width", 2);
            selected = true;
        }
    };

    this.deselectLayer = function () {
        layerPair.forEach(function (entry) {
            entry.border.style("stroke-width", 0);
        });
        selected = false;
    };

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
    };

    this.linkLayer = function (linkLayer) {
        linkedLayer = linkedLayer;
    };

    this.setStackCount = function (newStackCount) {
        setStackCount(newStackCount);
    };

    this.setFiltersize = function (newFiltersize) {
        setFiltersize(newFiltersize);
    };

    this.getFiltersize = function () {
        return filtersize;
    };

    this.getStackCount = function () {
        return stackCount;
    };
}

function deselectAllLayers() {
    for (var i = 0; i < encoderDecoderLayerPairs.length; i++) {
        encoderDecoderLayerPairs[i].deselectLayer();
    }
    if (inputOutputLayerPair !== null) {
        inputOutputLayerPair.deselectLayer();
    }

}


// function createANNLayer(width, height, layerWidth, layerHeight, stackCount, filtersize, parentNodeID,
//                         modifiableFiltersize, modifiableStackCount, linkedLayer) {
//     //create plot pane:
//     var plot = d3.select("#" + parentNodeID)
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height)
//         .style('background-color', '#3a3a3a')
//         .style('stroke-width', 1);
//
//     //Scales:
//     var xScale = d3.scaleLinear();
//     xScale.domain([0, layerWidth + 0.2 * Math.max(stackCount, 2) * layerWidth]);
//     xScale.range([0, width - 20]);
//     var yScale = d3.scaleLinear();
//     yScale.domain([0, layerHeight + 0.2 * Math.max(stackCount, 2) * layerHeight]);
//     yScale.range([0, height - 20]);
//
//     //helper variables:
//     var transitionFinished = true;
//
//     //TODO: move styling to css
//
//     // draw rectangles
//     for (var i = 1; i <= stackCount; i++) {
//         plot.append("rect")
//             .attr('class', 'stack_rect')
//             .attr("x", width - xScale(layerWidth) - i * 0.2 * xScale(layerWidth))
//             .attr("y", i * 0.2 * yScale(layerHeight))
//             .attr("width", xScale(layerWidth))
//             .attr("height", yScale(layerHeight))
//             .style('stroke-width', 1)
//             .style('stroke', "orange")
//             .style('fill', "orange")
//             .style('fill-opacity', 0.3);
//     }
//
//     // add filter size rect:
//     plot.append("rect")
//         .attr('class', 'filter_rect')
//         .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
//         .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
//         .attr("width", xScale(filtersize))
//         .attr("height", yScale(filtersize))
//         .style('stroke-width', 2)
//         .style('stroke', "red")
//         .style('fill', "red")
//         .style('fill-opacity', 0.2);
//
//     // add description:
//     var xAxisDescription = plot.append("text")
//         .attr("class", "chart_description")
//         .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
//             ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ')
//         .style('fill', "orange")
//         .style("text-anchor", "middle")
//         .style("font-size", "12px")
//         .text(layerWidth + "px");
//     var yAxisDescription = plot.append("text")
//         .attr("class", "chart_description")
//         .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
//             (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)')
//         .style('fill', "orange")
//         .style("text-anchor", "middle")
//         .style("font-size", "12px")
//         .text(layerWidth + "px");
//     var stackDescription = plot.append("text")
//         .attr("class", "stack_description")
//         .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
//             (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
//         .style('fill', "orange")
//         .style("text-anchor", "middle")
//         .style("font-size", "12px")
//         .text('stacks: ' + stackCount);
//
//     // add +/- buttons
//     if (modifiableStackCount) {
//         var stackPlusButtonGroup = plot.append("g")
//             .attr("class", "stack_button")
//             .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
//                 (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
//             .on('click', function () {
//                 if (transitionFinished) {
//                     if (linkedLayer != null) {
//                         linkedLayer.addStack();
//                     }
//                     addStack();
//                 }
//             });
//         stackPlusButtonGroup.append("circle")
//             .attr('r', 7)
//             .attr('cx', 10)
//             .attr("class", "stack_button")
//             .style('stroke-width', 1)
//             .style('stroke', "orange")
//             .style('fill', '#3a3a3a');
//
//         stackPlusButtonGroup.append('text')
//             .attr('x', 10)
//             .attr('y', 4)
//             .style('fill', "orange")
//             .style("text-anchor", "middle")
//             .style("font-size", "16px")
//             .style("font-weight", "bold")
//             .text('+')
//             .on("mouseover", function (d) {
//                 d3.select(this).style("cursor", "default");
//             });
//
//         var stackMinusButtonGroup = plot.append("g")
//             .attr("class", "stack_button")
//             .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
//                 (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)')
//             .on('click', function () {
//                 if (transitionFinished) {
//                     if (linkedLayer != null) {
//                         linkedLayer.removeStack();
//                     }
//                     removeStack();
//                 }
//             });
//         stackMinusButtonGroup.append("circle")
//             .attr('r', 7)
//             .attr('cx', -10)
//             .attr("class", "stack_button")
//             .style('stroke-width', 1)
//             .style('stroke', "orange")
//             .style('fill', '#3a3a3a');
//
//         stackMinusButtonGroup.append('text')
//             .attr('x', -10)
//             .attr('y', 4)
//             .style('fill', "orange")
//             .style("text-anchor", "middle")
//             .style("font-size", "16px")
//             .style("font-weight", "bold")
//             .text('-')
//             .on("mouseover", function (d) {
//                 d3.select(this).style("cursor", "default");
//             });
//     }
//
//
//     // add filtersize description and buttons:
//     var filtersizeDescription = plot.append("text")
//         .attr("class", "filter_description")
//         .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 25) + ', ' +
//             (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight) - 5) + ') rotate(315)')
//         .style('fill', "orange")
//         .style("text-anchor", "middle")
//         .style("font-size", "12px")
//         .text('Filtersize: ' + filtersize);
//
//     // add +/- buttons
//     if (modifiableFiltersize) {
//         var filterPlusButtonGroup = plot.append("g")
//             .attr("class", "filter_button")
//             .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15) + ', ' +
//                 (((stackCount / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)')
//             .on('click', function () {
//                 if (transitionFinished) {
//                     if (linkedLayer != null) {
//                         linkedLayer.increaseFiltersize();
//                     }
//                     increaseFiltersize();
//                 }
//             });
//         filterPlusButtonGroup.append("circle")
//             .attr('r', 7)
//             .attr('cx', 10)
//             .attr("class", "filter_button")
//             .style('stroke-width', 1)
//             .style('stroke', "orange")
//             .style('fill', '#3a3a3a');
//
//         filterPlusButtonGroup.append('text')
//             .attr('x', 10)
//             .attr('y', 4)
//             .style('fill', "orange")
//             .style("text-anchor", "middle")
//             .style("font-size", "16px")
//             .style("font-weight", "bold")
//             .text('+')
//             .on("mouseover", function (d) {
//                 d3.select(this).style("cursor", "default");
//             });
//
//         var filterMinusButtonGroup = plot.append("g")
//             .attr("class", "filter_button")
//             .attr('transform', 'translate(' + (width - ((stackCount / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15) + ', ' +
//                 (((stackCount / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)')
//             .on('click', function () {
//                 if (transitionFinished) {
//                     if (linkedLayer != null) {
//                         linkedLayer.decreaseFiltersize();
//                     }
//                     decreaseFiltersize();
//                 }
//             });
//         filterMinusButtonGroup.append("circle")
//             .attr('r', 7)
//             .attr('cx', -10)
//             .attr("class", "filter_button")
//             .style('stroke-width', 1)
//             .style('stroke', "orange")
//             .style('fill', '#3a3a3a');
//
//         filterMinusButtonGroup.append('text')
//             .attr('x', -10)
//             .attr('y', 4)
//             .style('fill', "orange")
//             .style("text-anchor", "middle")
//             .style("font-size", "16px")
//             .style("font-weight", "bold")
//             .text('-')
//             .on("mouseover", function (d) {
//                 d3.select(this).style("cursor", "default");
//             });
//     }
//
//
//     // print console output:
//     console.log("layerWidth: " + layerWidth);
//     console.log("last rect x pos: " + ((width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(layerWidth) / 2)));
//     console.log("layerWidth scaled: " + xScale(layerWidth));
//     console.log("Width text position: " + (xScale(layerWidth) / 2 + 20));
//
//
//     function rescaleChart() {
//         // rescale Scales:
//         xScale.domain([0, layerWidth + 0.2 * stackCount * layerWidth]);
//         yScale.domain([0, layerHeight + 0.2 * stackCount * layerHeight]);
//
//         // move stack description
//         xAxisDescription.transition()
//             .duration(500)
//             .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 0.5) * xScale(layerWidth)) + ', ' +
//                 ((stackCount * 0.2 + 1) * yScale(layerHeight) + 15) + ') ');
//         yAxisDescription.transition()
//             .duration(500)
//             .attr('transform', 'translate(' + (width - (stackCount * 0.2 + 1) * xScale(layerWidth) - 7) + ', ' +
//                 (stackCount * 0.2 + 0.5) * yScale(layerHeight) + ') rotate(270)');
//         stackDescription.transition()
//             .duration(500)
//             .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth)) + ', ' +
//                 (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 20) + ') rotate(315)')
//             .text('stacks: ' + stackCount);
//
//
//         // move stack +/- buttons:
//         if (modifiableStackCount) {
//             stackMinusButtonGroup.transition()
//                 .duration(500)
//                 .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
//                     (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');
//             stackPlusButtonGroup.transition()
//                 .duration(500)
//                 .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2) * xScale(layerWidth) + 10) + ', ' +
//                     (((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * yScale(layerHeight) + 30) + ') rotate(315)');
//         }
//
//
//         // move filtersize description
//         filtersizeDescription
//             .transition()
//             .duration(500)
//             .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 25)
//                 + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight) - 5) + ') rotate(315)');
//
//         // move filtersize +/- buttons:
//         if (modifiableFiltersize) {
//             filterPlusButtonGroup
//                 .transition()
//                 .duration(500)
//                 .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15)
//                     + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)');
//             filterMinusButtonGroup
//                 .transition()
//                 .duration(500)
//                 .attr('transform', 'translate(' + (width - ((Math.max(stackCount, 2) / 2.0) * 0.2 + 1) * xScale(layerWidth) - 15)
//                     + ', ' + (((Math.max(stackCount, 2) / 2.0) * 0.2) * yScale(layerHeight)) + ') rotate(315)');
//         }
//
//
//         // move existing stacks:
//         plot.selectAll(".stack_rect")
//             .transition()
//             .duration(500)
//             .attr("x", function (d, i) {
//                 return width - xScale(layerWidth) - (i + 1) * 0.2 * xScale(layerWidth);
//             })
//             .attr("y", function (d, i) {
//                 return (i + 1) * 0.2 * yScale(layerHeight);
//             })
//             .attr("width", function (d, i) {
//                 return xScale(layerWidth);
//             })
//             .attr("height", function (d, i) {
//                 return yScale(layerHeight);
//             });
//
//         //move filter rect:
//         plot.select(".filter_rect")
//             .transition()
//             .duration(500)
//             .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
//             .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
//             .attr("width", xScale(filtersize))
//             .attr("height", yScale(filtersize));
//     }
//
//     function addStack() {
//         // start animation
//         transitionFinished = false;
//
//         // update stack count
//         stackCount += 1;
//         rescaleChart();
//
//
//         // add additional stack
//         plot.append("rect")
//             .transition()
//             .duration(500)
//             .attr('class', 'stack_rect')
//             .attr("x", width - xScale(layerWidth) - (stackCount) * 0.2 * xScale(layerWidth))
//             .attr("y", (stackCount) * 0.2 * yScale(layerHeight))
//             .attr("width", xScale(layerWidth))
//             .attr("height", yScale(layerHeight))
//             .style('stroke-width', 1)
//             .style('stroke', "lightBlue")
//             .style('fill', "lightBlue")
//             .style('fill-opacity', 0.3)
//             // fade out highlight color:
//             .transition()
//             .duration(500)
//             .style('stroke', "orange")
//             .style('fill', "orange")
//             .on("end", function () {
//                 transitionFinished = true;
//                 console.log("transition finished");
//             });
//
//     }
//
//     function removeStack() {
//         //abort if only on stack left
//         if (stackCount < 2) {
//             return;
//         }
//
//         // start animation
//         transitionFinished = false;
//
//         // update stack count
//         stackCount -= 1;
//         rescaleChart();
//
//
//         // remove stack
//         plot.selectAll('.stack_rect')
//             .filter(function (d, i, list) {
//                 return i === list.length - 1;
//             }).transition()
//             .duration(500).remove()
//             .on("end", function () {
//                 transitionFinished = true;
//                 console.log("transition finished");
//             });
//
//
//     }
//
//     function increaseFiltersize() {
//         // return if filtersize equals layer size
//         if (filtersize === Math.min(layerWidth, layerWidth)) {
//             return
//         }
//
//         // start animation
//         transitionFinished = false;
//
//
//         // update filtersize
//         filtersize += 1;
//
//         filtersizeDescription.text('Filtersize: ' + filtersize);
//
//
//         if ((Math.min(layerWidth, layerWidth) - filtersize) < 3) {
//             plot.select(".filter_rect")
//                 .transition()
//                 .duration(500)
//                 .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth))
//                 .attr("y", stackCount * 0.2 * yScale(layerHeight))
//                 .attr("width", xScale(filtersize))
//                 .attr("height", yScale(filtersize))
//                 .on("end", function () {
//                     transitionFinished = true;
//                     console.log("transition finished");
//                 });
//         } else {
//             plot.select(".filter_rect")
//                 .transition()
//                 .duration(500)
//                 .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
//                 .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
//                 .attr("width", xScale(filtersize))
//                 .attr("height", yScale(filtersize))
//                 .on("end", function () {
//                     transitionFinished = true;
//                     console.log("transition finished");
//                 });
//         }
//
//     }
//
//     function decreaseFiltersize() {
//         // return if filtersize already 1
//         if (filtersize < 2) {
//             return
//         }
//
//         // start animation
//         transitionFinished = false;
//
//         // update filtersize
//         filtersize -= 1;
//
//         filtersizeDescription.text('Filtersize: ' + filtersize);
//
//
//         if ((Math.min(layerWidth, layerWidth) - filtersize) < 3) {
//             plot.select(".filter_rect")
//                 .transition()
//                 .duration(500)
//                 .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth))
//                 .attr("y", stackCount * 0.2 * yScale(layerHeight))
//                 .attr("width", xScale(filtersize))
//                 .attr("height", yScale(filtersize))
//                 .on("end", function () {
//                     transitionFinished = true;
//                     console.log("transition finished");
//                 });
//         } else {
//             plot.select(".filter_rect")
//                 .transition()
//                 .duration(500)
//                 .attr("x", width - xScale(layerWidth) - stackCount * 0.2 * xScale(layerWidth) + xScale(3))
//                 .attr("y", stackCount * 0.2 * yScale(layerHeight) + yScale(3))
//                 .attr("width", xScale(filtersize))
//                 .attr("height", yScale(filtersize))
//                 .on("end", function () {
//                     transitionFinished = true;
//                     console.log("transition finished");
//                 });
//         }
//
//     }
//
//     function setLayerDimension(newWidth, newHeight) {
//         if (newWidth > 0) {
//             layerWidth = newWidth;
//         }
//         if (newHeight > 0) {
//             layerHeight = newHeight;
//         }
//
//         rescaleChart();
//     }
//
//
//     this.addStack = function () {
//         addStack();
//     };
//
//     this.removeStack = function () {
//         removeStack();
//     };
//
//     this.increaseFiltersize = function () {
//         increaseFiltersize();
//     };
//
//     this.decreaseFiltersize = function () {
//         decreaseFiltersize();
//     };
//
//     this.setLayerDimension = function (newWidth, newHeight) {
//         setLayerDimension(newWidth, newHeight);
//     }
//
//
// }