Template.record.onCreated(function() {
  $.getScript("https://webrtcexperiment-webrtc.netdna-ssl.com/RecordRTC.js");
  $.getScript("https://webrtcexperiment-webrtc.netdna-ssl.com/gif-recorder.js");
  $.getScript("https://webrtcexperiment-webrtc.netdna-ssl.com/getScreenId.js");
});

// view-source:https://www.webrtc-experiment.com/RecordRTC/
Template.record.onRendered(function () {

  var params = {},
      r = /([^&=]+)=?([^&]*)/g;

  function d(s) {
      return decodeURIComponent(s.replace(/\+/g, ' '));
  }

  var match, search = window.location.search;
  while (match = r.exec(search.substring(1)))
      params[d(match[1])] = d(match[2]);

  window.params = params;

  var recordAudio       = document.getElementById('record-audio'),
     recordVideo        = document.getElementById('record-video'),
     recordGIF          = document.getElementById('record-gif'),
     stopRecordingAudio = document.getElementById('stop-recording-audio'),
     pauseResumeAudio   = document.getElementById('pause-resume-audio'),
     pauseResumeVideo   = document.getElementById('pause-resume-video'),
     pauseResumeGif     = document.getElementById('pause-resume-gif'),
     stopRecordingVideo = document.getElementById('stop-recording-video'),
     stopRecordingGIF   = document.getElementById('stop-recording-gif');

  var canvasWidth_input = document.getElementById('canvas-width-input'),
     canvasHeight_input = document.getElementById('canvas-height-input');

  if(params.canvas_width) {
     canvasWidth_input.value = params.canvas_width;
  }

  if(params.canvas_height) {
     canvasHeight_input.value = params.canvas_height;
  }

  var video = document.getElementById('video');
  var audio = document.getElementById('audio');

  var videoConstraints = {
     audio: false,
     video: {
         mandatory: {},
         optional: []
     }
  };

  var audioConstraints = {
     audio: true,
     video: false
  };

  var audioStream;
  var recorder;

  recordAudio.onclick = function() {
     if (!audioStream)
         navigator.getUserMedia(audioConstraints, function(stream) {
             if (window.IsChrome) stream = new window.MediaStream(stream.getAudioTracks());
             audioStream = stream;

             // "audio" is a default type
             recorder = window.RecordRTC(stream, {
                 type: 'audio',
                 bufferSize: typeof params.bufferSize == 'undefined' ? 16384 : params.bufferSize,
                 sampleRate: typeof params.sampleRate == 'undefined' ? 44100 : params.sampleRate,
                 leftChannel: params.leftChannel || false,
                 disableLogs: params.disableLogs || false
             });
             recorder.startRecording();
         }, function() {});
     else {
         audio.src = URL.createObjectURL(audioStream);
         audio.muted = true;
         audio.play();
         if (recorder) recorder.startRecording();
     }

     window.isAudio = true;

     this.disabled = true;
     stopRecordingAudio.disabled = false;
     pauseResumeAudio.disabled = false;
  };

  var screen_constraints;

  function isCaptureScreen(callback) {
     if (document.getElementById('record-screen').checked) {
         document.getElementById('fit-to-screen').onclick();

         getScreenId(function (error, sourceId, _screen_constraints) {
             if(error === 'not-installed') {
                 window.open('https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
             }

             if(error === 'permission-denied') {
                 alert('Screen capturing permission is denied.');
             }

             if(error === 'installed-disabled') {
                 alert('Please enable chrome screen capturing extension.');
             }

             if(_screen_constraints) {
                 screen_constraints = _screen_constraints.video;
                 videoConstraints = _screen_constraints;
             }
             else {
                 videoConstraints = screen_constraints;
             }

             callback();
         });
     }
     else {
         callback();
     }
  }

  recordVideo.onclick = function() {
     isCaptureScreen(function() {
         recordVideoOrGIF(true);
     });
  };

  recordGIF.onclick = function() {
     isCaptureScreen(function() {
         recordVideoOrGIF(false);
     });
  };

  function recordVideoOrGIF(isRecordVideo) {
     navigator.getUserMedia(videoConstraints, function(stream) {
         video.onloadedmetadata = function() {
             video.width = canvasWidth_input.value || 320;
             video.height = canvasHeight_input.value || 240;

             var options = {
                 type: isRecordVideo ? 'video' : 'gif',
                 video: video,
                 canvas: {
                     width: canvasWidth_input.value,
                     height: canvasHeight_input.value
                 },
                 disableLogs: params.disableLogs || false,
                 recorderType: null // to let RecordRTC choose relevant types itself
             };

             recorder = window.RecordRTC(stream, options);
             recorder.startRecording();

             video.onloadedmetadata = false;
         };
         video.src = URL.createObjectURL(stream);
     }, function() {
         if (document.getElementById('record-screen').checked) {
             if (location.protocol === 'http:')
                 alert('<https> is mandatory to capture screen.');
             else
                 alert('Multi-capturing of screen is not allowed. Capturing process is denied. Are you enabled flag: "Enable screen capture support in getUserMedia"?');
         } else
             alert('Webcam access is denied.');
     });

     window.isAudio = false;

     if (isRecordVideo) {
         recordVideo.disabled = true;
         stopRecordingVideo.disabled = false;
         pauseResumeVideo.disabled = false;
     } else {
         recordGIF.disabled = true;
         stopRecordingGIF.disabled = false;
         pauseResumeGif.disabled = false;
     }
  }

  stopRecordingAudio.onclick = function() {
     this.disabled = true;
     recordAudio.disabled = false;
     audio.src = '';

     if (recorder)
         recorder.stopRecording(function(url) {
             audio.src = url;
             audio.muted = false;
             audio.play();

             document.getElementById('audio-url-preview').innerHTML = '<a href="' + url + '" target="_blank">Recorded Audio URL</a>';
         });
  };

  pauseResumeAudio.onclick = pauseResumeVideo.onclick = pauseResumeGif.onclick =  function() {
     if(!recorder) return;

     if(this.innerHTML === 'Pause') {
         this.innerHTML = 'Resume';
         recorder.pauseRecording();
         return;
     }

     this.innerHTML = 'Pause';
     recorder.resumeRecording();
  };

  stopRecordingVideo.onclick = function() {
     this.disabled = true;
     recordVideo.disabled = false;

     if (recorder)
         recorder.stopRecording(function(url) {
             video.src = url;
             video.play();

             document.getElementById('video-url-preview').innerHTML = '<a href="' + url + '" target="_blank">Recorded Video URL</a>';
         });
  };

  stopRecordingGIF.onclick = function() {
     this.disabled = true;
     recordGIF.disabled = false;

     if (recorder)
         recorder.stopRecording(function(url) {
             document.getElementById('video-url-preview').innerHTML = '<a href="' + url + '" target="_blank">Recorded Gif URL</a>';
         });
  };
})
