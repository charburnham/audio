// Initialize jsPsych
const jsPsych = initJsPsych({
  show_progress_bar: true,
  on_finish: function() {
    //jsPsych.data.displayData();
    window.location.href = 'finish.html';
  }
});

const subject_id = jsPsych.randomization.randomID(10);
const DATAPIPE_EXPERIMENT_ID = "khJ8Nh63lw9p";
const datapipeConfigured = DATAPIPE_EXPERIMENT_ID.trim() !== "";
const data_filename = `${subject_id}_data.csv`;
const timeline = [];

jsPsych.data.addProperties({
  subject_id: subject_id
});

function queueAudioUpload(data, filename) {
  if (!datapipeConfigured) {
    console.warn("DataPipe experiment ID is not configured. Audio upload was skipped.");
    data.response = filename;
    data.audio_upload = "skipped_missing_datapipe_id";
    return;
  }

  jsPsychPipe.saveBase64Data(DATAPIPE_EXPERIMENT_ID, filename, data.response);
  data.response = filename;
  data.audio_upload = "queued";
}

function buildSentenceTrial(trial_obj) {
  let latestRecording = null;
  let attemptNumber = 0;

  return {
    timeline: [
      {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
          <div class="recording-instructions-box">
            <h2>Read the sentence aloud</h2>
            <p>Take a moment to get ready. When you are ready to begin, click the button below to start recording.</p>
            <p class="sentence-stimulus">${trial_obj.stimulus}</p>
          </div>
        `,
        choices: ['Start Recording'],
        data: {
          stimulus_code: trial_obj.code,
          sentence: trial_obj.stimulus,
          condition: trial_obj.condition,
          trial_stage: 'sentence_ready'
        }
      },
      {
        type: jsPsychHtmlAudioResponse,
        stimulus: `
          <div class="recording-instructions-box">
            <h2>Recording in progress</h2>
            <p>Please read the sentence naturally, then click the button when you are done.</p>
            <p class="sentence-stimulus">${trial_obj.stimulus}</p>
          </div>
        `,
        recording_duration: 15000,
        show_done_button: true,
        allow_playback: false,
        save_audio_url: true,
        done_button_label: 'Finish Recording',
        data: {
          stimulus_code: trial_obj.code,
          sentence: trial_obj.stimulus,
          condition: trial_obj.condition,
          trial_stage: 'sentence_recording'
        },
        on_finish: function(data) {
          attemptNumber += 1;
          latestRecording = {
            response: data.response,
            audio_url: data.audio_url,
            filename: `${subject_id}_${trial_obj.code}_audio.webm`
          };

          data.recording_attempt = attemptNumber;
          data.recording_filename = latestRecording.filename;
          data.response = null;
        }
      },
      {
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
          return `
            <div class="recording-instructions-box">
              <h2>Review your recording</h2>
              <p>Listen to your recording for this sentence. If you want, you can record it again before moving on.</p>
              <p class="sentence-stimulus">${trial_obj.stimulus}</p>
              <audio controls src="${latestRecording.audio_url}" class="playback-audio"></audio>
            </div>
          `;
        },
        choices: ['Re-record', 'Continue to Next Sentence'],
        data: {
          stimulus_code: trial_obj.code,
          sentence: trial_obj.stimulus,
          condition: trial_obj.condition,
          trial_stage: 'sentence_review'
        },
        on_finish: function(data) {
          data.recording_attempt = attemptNumber;
          data.recording_filename = latestRecording.filename;
          data.review_decision = data.response === 0 ? 'rerecord' : 'accepted';

          if (data.response === 1) {
            const uploadRecord = {
              response: latestRecording.response,
              audio_upload: null
            };
            queueAudioUpload(uploadRecord, latestRecording.filename);
            data.audio_upload = uploadRecord.audio_upload;
            data.saved_audio_file = latestRecording.filename;
          } else {
            data.audio_upload = "not_uploaded_rerecorded";
            data.saved_audio_file = null;
          }

          if (latestRecording.audio_url) {
            URL.revokeObjectURL(latestRecording.audio_url);
          }

          latestRecording = null;
        }
      }
    ],
    loop_function: function() {
      const lastReview = jsPsych.data.get().filter({
        stimulus_code: trial_obj.code,
        trial_stage: 'sentence_review'
      }).last(1).values()[0];

      return lastReview.response === 0;
    }
  };
}

// 1. Consent Form
const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="consent">
      <h2>Consent Form</h2>
      <p>If you agree to participate in this research, please click "Continue".</p>
    </div>
  `,
  choices: ['Continue']
};
timeline.push(consent);

// 2. Instructions
const instructions = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="instructions">
      <h2>Instructions</h2>
      <p>In this experiment, you will see a sentence on the screen.</p>
      <p>Your task is to record yourself reading that sentence aloud using your microphone.</p>
      <p>For each sentence, you'll click <strong>Start Recording</strong> when you're ready, rather than having the recording begin right away.</p>
      <p>After each recording, you can listen back and either continue to the next sentence or re-record.</p>
      <p>Click "Next" to continue to the microphone test.</p>
    </div>
  `,
  choices: ['Next']
};
timeline.push(instructions);

const checklist = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="content">
      <h2>Quick Checklist Before You Begin</h2>
      <div class="tip-box">
         <h3><img src="https://www.google.com/chrome/static/images/chrome-logo.svg" style="height: 1em; vertical-align: middle; margin-right: 0.3em;"> Chrome Browser required</h3>
         <p><strong>To ensure the experiment runs smoothly, please use the Google Chrome browser.</strong></p>
      </div>
      <div class="tip-box">
        <h3>Microphone is required</h3>
        <p><strong>Please make sure you can use a microphone and allow microphone access when prompted by your browser.</strong></p>
        
        <div class="mic-confirm-box">
          <p><strong>Are you able to use a microphone to record your voice during this experiment?</strong></p>
          <label><input type="radio" name="mic_confirm" value="yes"> Yes</label><br>
          <label><input type="radio" name="mic_confirm" value="no"> No</label>
        </div>
      </div>

      <p class="mic-warning" style="color: red; display: none; margin-top: 10px;">
        Unfortunately, you cannot participate in this study without a working microphone.
      </p>
      <button id="custom-next" class="jspsych-btn">Next</button>
    </div>
  `,
  choices: "NO_KEYS",
  on_load: function () {
    document.getElementById('custom-next').addEventListener('click', function () {
      const selected = document.querySelector('input[name="mic_confirm"]:checked');
      if (selected && selected.value === "yes") {
        jsPsych.finishTrial({ microphone_confirmed: "yes" });
      } else {
        document.querySelector('.mic-warning').style.display = 'block';
      }
    });
  }
};
timeline.push(checklist);

// Microphone setup instruction
const micSetupInstruction = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="content">
      <h2>Microphone Setup</h2>
      <div class="instruction-box">
        <p>Before starting the experiment, we need to set up your microphone.</p>
        <p>On the next page:</p>
        <ul>
          <li>Your browser will ask for microphone permission - please click <strong>Allow</strong></li>
          <li>You'll see a dropdown menu with available microphones</li>
          <li>Select the microphone you want to use</li>
          <li>Click "Use this microphone" to continue</li>
        </ul>
      </div>
    </div>
  `,
  choices: ['Continue']
};
timeline.push(micSetupInstruction);

// Setting up microphone
const micSetup = {
  type: jsPsychInitializeMicrophone
};
timeline.push(micSetup);
    
    // Microphone test trial
    const trialinstructions = {
      type: jsPsychInstructions,
      pages: [`
        <div class="content">
          <h2>Microphone Test</h2>

          <div class="instruction-box">
            <p>You'll now test your microphone by making a short recording.</p>

            <p>Speak naturally. You can say anything you like, such as: <em>"Testing, one, two, three."</em></p>
          </div>
          <div class="tip-box">
            <p>After recording, you'll be able to play it back to make sure it's working.</p> 
            <p>If the microphone worked well, you should be able to hear what you recorded.</p>
              <p><strong>Please make sure that your speaker is <em>on</em> with an appropriate volume.</stong></p>
          </div>
            <p>When you're ready, click <strong>"Next"</strong> to continue to the start screen.</p>
        `
    ],
    show_clickable_nav: true,
    };      
    timeline.push(trialinstructions);

    const microphoneTestReady = {
      type: jsPsychHtmlButtonResponse,
      stimulus: `
        <div class="content">
          <div class="recording-box">
            <h3>Microphone Test</h3>
            <p>Take a moment to get ready.</p>
            <p>Click the button below when you want to begin the test recording.</p>
          </div>
        </div>
      `,
      choices: ['Start Recording'],
      data: {
        trial_type_label: 'microphone_test_ready'
      }
    };
    timeline.push(microphoneTestReady);

    const testing = {
      type: jsPsychHtmlAudioResponse,
      stimulus: `
          <div class="content">
          <div class="recording-box">
          <h3>Recording in Progress...</h3>
          <p>Speak naturally, for example: <em>"Testing, 1, 2, 3."</em></p>
      </div>
    `,
      show_done_button: true,
      done_button_label: 'Finish Recording',
      recording_duration: 5000,
      allow_playback: true,
      data: {
        trial_type_label: 'microphone_test'
      },
      on_finish: function(data) {
        const filename = `${subject_id}_microphone_test_audio.webm`;
        queueAudioUpload(data, filename);
      }
    };
    timeline.push(testing)

// Begin main experiment
const beginMain = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="content">
      <div class="begin-box">
        <h2>Let's Begin!</h2>
        <p>Now the microphone test is done and the main part begins.</p>
        <p>Each sentence will appear first, and you'll click <strong>Start Recording</strong> when you're ready to speak.</p>
        <p>After each sentence, you'll be able to listen to your recording and decide whether to keep it or record again.</p>
        <p>Click "Continue" to start recording the sentences.</p>
      </div>
    </div>
  `,
  choices: ['Continue']
};
timeline.push(beginMain);

// 5. Recording Task
// Shuffle the trial objects
const shuffled_trials = randomize_trials(trial_objects);

shuffled_trials.forEach(trial_obj => {
  timeline.push(buildSentenceTrial(trial_obj));
});

if (datapipeConfigured) {
  const save_data = {
    type: jsPsychPipe,
    action: "save",
    experiment_id: DATAPIPE_EXPERIMENT_ID,
    filename: data_filename,
    data_string: () => jsPsych.data.get().csv()
  };

  timeline.push(save_data);
}

// Run the experiment
jsPsych.run(timeline);
