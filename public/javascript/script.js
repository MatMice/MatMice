document.addEventListener('DOMContentLoaded', function() {
    let emojiElements = document.querySelectorAll('.emoji');
    let inputField = document.querySelector('#prompt');

    emojiElements.forEach((element) => {
        element.addEventListener('click', function(event) {
            inputField.value += event.target.textContent;
        });
    });

    let dropElements = document.querySelectorAll('.droppable');
    dropElements.forEach((element) => {
        element.addEventListener('drop', function(event) {
            drop(event);
        });
        element.addEventListener('dragover', function(event) {
            allowDrop(event);
        });
    });

    let dragElements = document.querySelectorAll('.draggable');
    dragElements.forEach((element) => {
        element.addEventListener('dragstart', function(event) {
            drag(event);
        });
    });
});

function drag(event) {
    event.dataTransfer.setData("text", event.target.id);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    var data = event.dataTransfer.getData("text");
    var emoji = document.getElementById(data).textContent;
    event.target.value += emoji;
}