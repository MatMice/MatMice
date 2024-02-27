//So we probably will migrate away from running JS on the client and instead run it on the server...

document.querySelectorAll('.save-btn').forEach(button => {
    button.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        const filename = this.getAttribute('data-filename');
        saveAsFile(url, filename);
    });
});

function saveAsFile(url, filename) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
            element.setAttribute('download', filename);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        })
        .catch(console.error);
}

document.querySelector('.save-all-btn').addEventListener('click', saveAllSites);

function saveAllSites() {
    document.querySelectorAll('.save-btn').forEach(button => {
        const url = button.getAttribute('data-url');
        const filename = button.getAttribute('data-filename');
        saveAsFile(url, filename);
    });
}