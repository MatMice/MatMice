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
const promptInput = document.getElementById('prompt');
  const speechButton = document.getElementById('speechButton');

  let isRecording = false;

  if (annyang) {
    const commands = {
      '*transcript': function(transcript) {
        promptInput.value = transcript;
      }
    };

    annyang.addCommands(commands);

    speechButton.addEventListener('click', () => {
      if (!isRecording) {
        annyang.start();
        speechButton.textContent = 'Stop Recording';
      } else {
        annyang.abort();
        speechButton.textContent = 'Start Recording';
      }
      isRecording = !isRecording;
    });
  } else {
    console.log('Speech recognition not supported');
  }