/*
    link event listener
 */

// activate checkbox highlighting
var tableCheckboxList = document.getElementsByClassName("tableSelector");
for (var i = 0; i < tableCheckboxList.length; i++) {
    tableCheckboxList[i].addEventListener("change", function () {
        if (this.checked) {
            this.parentNode.style.backgroundColor = "orange";
        } else {
            this.parentNode.style.backgroundColor = "#2a2a2a";
        }
    })
}

