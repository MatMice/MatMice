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