const Nodes = (function () {
    const BUFFER_INTERVAL = 1024;

    let initialized = false;
    let context;
    let mediaSource;
    let analyzer;
    let scriptProcessor;
    let gainNode;

    function setUp() {
        if (initialized) {
            throw "Already initialized (call destroyContext() first)";
        }

        context = new (window.AudioContext || window.webkitAudioContext)();

        if (mediaSource === undefined) {
            mediaSource = context.createMediaElementSource(document.getElementsByTagName("audio")[0]);
        }

        gainNode = context.createGain();
        mediaSource.connect(gainNode);
        gainNode.connect(context.destination);

        scriptProcessor = context.createScriptProcessor(BUFFER_INTERVAL, 1, 1);
        scriptProcessor.onaudioprocess = handleAudio;
        scriptProcessor.connect(context.destination);

        analyzer = context.createAnalyser();
        analyzer.connect(scriptProcessor);
        analyzer.smoothingTimeConstant = Config.temporalSmoothing;
        analyzer.minDecibels = Config.minDecibels;
        analyzer.maxDecibels = Config.maxDecibels;

        try {
            analyzer.fftSize = Config.fftSize;
            console.log("Using fftSize of " + analyzer.fftSize);
        } catch (ex) {
            const msg = "Failed to set fftSize - try updating your browser.";
            alert(msg);
            throw new Error(msg);
        }

        mediaSource.connect(analyzer);
        initialized = true;
    }

    function handleAudio() {
        const array = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(array);

        const spectrum = Transform.transform(array);
        const multiplier = Math.pow(Transform.multiplier(spectrum), 0.8);
        Callbacks.invokeCallbacks(spectrum, multiplier);
    }

    // --- Public API ---
    return {
        setUp: setUp,

        getContext: function() {
            return context;
        },

        getMediaSource: function() {
            return mediaSource;
        },

        getAnalyser: function() {
            return analyzer;
        },

        playSong: function (song, url) {
            try {
                if (context.state === "suspended") {
                    context.resume().catch(e => console.error("context resume failed", e));
                }

                const audio = $("#audio")[0];
                audio.pause();
                audio.src = song != null ? "./songs/" + song.getFileId() : url;
                
                const promise = audio.play();
                if (promise !== undefined) {
                    promise.catch(error => {
                        if (error.name !== 'AbortError') { 
                            console.error('Playback failed:', error);
                        }
                    });
                }

                if (url == null) {
                    GuiWrapper.setTitle(song.getArtist(), song.getTitle());
                }
                
                GuiWrapper.updatePlayBtn();
                return promise;
            } catch (ex) {
                $("#audio").attr("src", null);
                return Promise.reject(ex);
            }
        },

        playSongFromUrl: function (url) {
            return this.playSong(null, url);
        },

        getVolume: function () {
            return Math.log((gainNode.gain.value + 1) * (Math.E - 1) + 1);
        },

        setVolume: function (volume) {
            gainNode.gain.value = (Math.exp(volume) - 1) / (Math.E - 1) - 1;
        },

        getOfflineFrequencyData: function(audioFile, fps, duration) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const arrayBuffer = e.target.result;
                    const offlineContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, Math.ceil(duration * 44100), 44100);

                    offlineContext.decodeAudioData(arrayBuffer, (buffer) => {
                        const source = offlineContext.createBufferSource();
                        source.buffer = buffer;

                        const analyser = offlineContext.createAnalyser();
                        analyser.fftSize = Config.fftSize;
                        analyser.smoothingTimeConstant = 0;
                        analyser.minDecibels = Config.minDecibels;
                        analyser.maxDecibels = Config.maxDecibels;

                        const scriptProcessor = offlineContext.createScriptProcessor(2048, 1, 1);
                        
                        source.connect(analyser);
                        analyser.connect(scriptProcessor);
                        scriptProcessor.connect(offlineContext.destination);
                        
                        const collectedFrames = [];
                        scriptProcessor.onaudioprocess = () => {
                            const array = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(array);
                            collectedFrames.push(array.slice(0));
                        };

                        source.start(0);

                        offlineContext.startRendering().then(() => {
                            const frameCount = Math.floor(duration * fps);
                            const resampledFrames = [];
                            const totalAudioFrames = collectedFrames.length;
                            for (let i = 0; i < frameCount; i++) {
                                const time = i / fps;
                                const audioFrameIndex = Math.floor((time / duration) * totalAudioFrames);
                                if(collectedFrames[audioFrameIndex]){
                                    resampledFrames.push(collectedFrames[audioFrameIndex]);
                                } else {
                                    resampledFrames.push(new Uint8Array(analyser.frequencyBinCount));
                                }
                            }
                            resolve(resampledFrames);
                        }).catch(reject);

                    }, reject);
                };
                reader.readAsArrayBuffer(audioFile);
            });
        }
    };
})();