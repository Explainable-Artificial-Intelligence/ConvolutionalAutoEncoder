/*
helper function to create a image grid for train images
 */


function ImageGrid(parentNode, rowCount) {

    var scrollPane = document.createElement("div");
    scrollPane.classList.add("imageGrid-scrollPane");
    parentNode.appendChild(scrollPane);

    var outerTable = document.createElement("table");
    outerTable.classList.add("imageGrid");
    scrollPane.appendChild(outerTable);

    // create table rows:
    for (var i = 0; i < (rowCount + 2); i++) {
        var tableRow = document.createElement("tr");
        outerTable.appendChild(tableRow);
    }


    this.addNewImageColumn = function (trainImages) {
        // add epoch and step:
        var tableCell = document.createElement("td");
        tableCell.textContent = "Epoch: " + trainImages.epoch;
        outerTable.rows[0].appendChild(tableCell);

        tableCell = document.createElement("td");
        tableCell.textContent = "";
        outerTable.rows[0].appendChild(tableCell);

        tableCell = document.createElement("td");
        tableCell.textContent = "";
        outerTable.rows[0].appendChild(tableCell);


        // add description
        tableCell = document.createElement("td");
        tableCell.classList.add("header");
        tableCell.textContent = "Input Images";
        outerTable.rows[1].appendChild(tableCell);

        tableCell = document.createElement("td");
        tableCell.classList.add("header");
        tableCell.textContent = "Latent Repr.";
        outerTable.rows[1].appendChild(tableCell);

        tableCell = document.createElement("td");
        tableCell.classList.add("header");
        tableCell.textContent = "Output Images";
        outerTable.rows[1].appendChild(tableCell);

        // add image pairs
        for (var i = 0; i < trainImages.inputLayer.length; i++) {
            // create new table row:
            var tableRow = outerTable.rows[i + 2];


            // create cell for input image
            var inputCell = document.createElement("td");
            inputCell.classList.add("inputImageColumn");
            // create new input image object
            var newInputImage = document.createElement("img");
            newInputImage.id = "InputImage_" + trainImages.inputLayer[i].id;
            newInputImage.src = "data:image/png;base64," + trainImages.inputLayer[i].bytestring.substring(2,
                trainImages.inputLayer[i].bytestring.length - 1);
            // newInputImage.classList.add("imageThumbnail");
            newInputImage.classList.add("inputImageThumbnail");


            // append new image to image grid
            inputCell.appendChild(newInputImage);
            tableRow.appendChild(inputCell);

            // create new latent image object
            var latentCell = document.createElement("td");
            latentCell.classList.add("latentImageColumn");
            for (var j = 0; j < trainImages.latentLayer[i].length; j++) {
                var newLatentImage = document.createElement("img");
                newLatentImage.id = "LatentImage_" + trainImages.latentLayer[i][j].id + "_" + j;
                newLatentImage.src = "data:image/png;base64," + trainImages.latentLayer[i][j].bytestring.substring(2,
                    trainImages.latentLayer[i][j].bytestring.length - 1);
                // newLatentImage.classList.add("imageThumbnail");
                newLatentImage.classList.add("latentImageThumbnail");

                // append new image div to image grid
                latentCell.appendChild(newLatentImage);
                if ((j + 1) % Math.floor(Math.sqrt(trainImages.latentLayer[i].length)) === 0) { //Math.ceil(Math.sqrt(data.latentLayer[i].length))
                    latentCell.appendChild(document.createElement('br'));
                }

            }
            // append new image div to image grid
            tableRow.appendChild(latentCell);

            // create cell for input image
            var outputCell = document.createElement("td");
            outputCell.classList.add("outputImageColumn");
            // create new output image object
            var newOutputImage = document.createElement("img");
            newOutputImage.id = "OutputImage_" + trainImages.outputLayer[i].id;
            newOutputImage.src = "data:image/png;base64," + trainImages.outputLayer[i].bytestring.substring(2,
                trainImages.outputLayer[i].bytestring.length - 1);
            // newOutputImage.classList.add("imageThumbnail");
            newOutputImage.classList.add("outputImageThumbnail");


            // append new image to image grid
            outputCell.appendChild(newOutputImage);
            tableRow.appendChild(outputCell);

        }

        // scroll right:
        scrollPane.scrollTo(trainImages.epoch * (360 + 32 * Math.floor(Math.sqrt(trainImages.latentLayer[0].length))), 0);
    };


}