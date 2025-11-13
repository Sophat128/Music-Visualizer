let Main = new function() {
    this.init = function() {
        Callbacks.setUp();
        
        Util.setUp();

        IoHandler.setUp();

        Nodes.setUp();

        Background.setUp();
        Database.setUp();
        GuiWrapper.setUp();

        Canvas.setUp();
        Emblem.setUp();
        Spectrum.setUp();

        Scene.setUp();
        Particles.setUp();
        Lighting.setUp();
        Renderer.setUp();

        AudioWrap.setUp();

        Background.loadInitial();
    }

    this.resizeCallback = function() {
        Canvas.setStyling();
        Particles.updateSizes();
        Renderer.updateSize();
    }

    this.exportOfflineVideo = async function() {
        const audio = document.getElementById('audio');
        const audioFile = document.getElementById('settingsAudioFileSelector').files[0];
        if (!audioFile) {
            throw new Error("Please select an audio file first.");
        }

        const fps = parseInt($('[name="fps"]').val()) || 30;
        const duration = audio.duration;
        const totalFrames = Math.floor(duration * fps);

        const canvas = Renderer.getCanvas();
        const { width, height } = canvas;

        // Get pre-calculated audio data
        const statusDiv = $('#export-status');
        statusDiv.text('Analyzing audio...').show();
        const audioFrames = await Nodes.getOfflineFrequencyData(audioFile, fps, duration);
        
        statusDiv.text('Encoding video...').show();

        const videoBlob = await new Promise(async (resolve, reject) => {
            const chunks = [];
            const encoder = new VideoEncoder({
                output: (chunk) => {
                    const data = new ArrayBuffer(chunk.byteLength);
                    chunk.copyTo(data);
                    chunks.push(data);
                },
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    reject(e);
                },
            });

            encoder.configure({ codec: 'vp09.00.10.08', width, height, framerate: fps });

            statusDiv.text('Rendering video frames...').show();
            for (let i = 0; i < totalFrames; i++) {
                this.renderVisualizerFrameAt(audioFrames[i]);

                // Create a VideoFrame directly from the canvas
                const frame = new VideoFrame(canvas, { timestamp: (i * 1000) / fps });
                encoder.encode(frame);
                frame.close();
                statusDiv.text(`Rendering video frames... (${i + 1}/${totalFrames})`).show();
            }

            await encoder.flush();
            resolve(new Blob(chunks, { type: 'video/webm' }));
        });

        const downloadUrl = URL.createObjectURL(videoBlob);
        const format = $('[name="format"]').val().toLowerCase();
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `export.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        statusDiv.text('Sending to server...').show();
        const formData = new FormData();
        formData.append('video', videoBlob, 'visualizer.webm');
        formData.append('audio', audioFile);
        formData.append('resolution', $('[name="resolution"]').val());
        formData.append('fps', $('[name="fps"]').val());
        formData.append('audioQuality', $('[name="audio-quality"]').val());
        formData.append('format', $('[name="format"]').val());

        const response = await fetch('http://localhost:8080/export-video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Conversion failed.');
        }

        const fileBlob = await response.blob();
        // const downloadUrl = URL.createObjectURL(fileBlob);
        // const format = $('[name="format"]').val().toLowerCase();
        // const a = document.createElement('a');
        // a.href = downloadUrl;
        // a.download = `export.${format}`;
        // document.body.appendChild(a);
        // a.click();
        // a.remove();
        // URL.revokeObjectURL(downloadUrl);
        statusDiv.html(`Conversion successful! <a href="${downloadUrl}" download="export.${format}" class="ui button compact primary">Download ${format.toUpperCase()}</a>`);

    }
    
    
    this.renderVisualizerFrameAt = function(audioFrame) {
        const spectrum = Transform.transform(audioFrame);
        const multiplier = Math.pow(Transform.multiplier(spectrum), 0.8);
        Callbacks.invokeCallbacks(spectrum, multiplier);
        Renderer.render();
    }

    window.onload = this.init;
    window.onresize = this.resizeCallback;
}