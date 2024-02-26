document.addEventListener('DOMContentLoaded', function() {
    const audio = document.getElementById('welcomeAudio');
    const paragraph = document.getElementById('playAudioParagraph');

    // Try to autoplay the audio
    audio.play().catch(function(error) {
        // Autoplay was prevented. This is usually due to the browser's autoplay policy.
        // Do nothing, the user can start the playback by clicking the paragraph.
    });

    // Start the playback when the paragraph is clicked
    paragraph.addEventListener('click', function() {
        audio.play();
    });
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.interimResults = true;

const promptInput = document.getElementById('prompt');
const speechButton = document.getElementById('speechButton');

let isRecording = false;

speechButton.addEventListener('click', () => {
  if (!isRecording) {
    recognition.start();
    speechButton.textContent = 'Stop Recording';
  } else {
    recognition.stop();
    speechButton.textContent = 'Start Recording';
  }
  isRecording = !isRecording;
});

recognition.addEventListener('result', (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0])
    .map(result => result.transcript)
    .join('');
  promptInput.value = transcript;
});

