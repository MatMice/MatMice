const emoji_length = 1000;
    // Start and end points of the range based on Unicode values for emojis
    let start = 0x1F600;
    let end = 0xFF64F;

    // Step 2: Create a variable for the start index
    let startIndex = start;

    function setupEmojiClick() {
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
    
    }
document.addEventListener('DOMContentLoaded', function() {


// Event listeners for panning or scrolling
document.getElementById('next-button').addEventListener('click', function() {
    if(startIndex + emoji_length <= end) {
        startIndex += emoji_length;
        renderEmojis();
    }
});

document.getElementById('prev-button').addEventListener('click', function() {
    if(startIndex - emoji_length >= start) {
        startIndex -= emoji_length;
        renderEmojis();
    }
});

// Initial render
renderEmojis();
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

// Step 3: Create a function to render emojis
// Function to render emojis
function renderEmojis() {
    let emojiContainer = document.getElementById('emojis-container');
    emojiContainer.innerHTML = ''; // Clear the container
    console.log(emojiContainer)
    
    for(let i = startIndex; i < startIndex + emoji_length && i <= end; i++) {
        let emojiElement = document.createElement('span');
        emojiElement.id = `emoji-${i}`;
        emojiElement.classList.add('emoji');
        emojiElement.classList.add('draggable');
        emojiElement.setAttribute('draggable', 'true');
        emojiElement.innerText = String.fromCodePoint(i);
        emojiContainer.appendChild(emojiElement);
    }
    setupEmojiClick()
}
