let Renderer = new function() {

    const TARGET_FPS = 60;
    const MS_DELAY = 1000 / TARGET_FPS;

    let renderer;

    this.setUp = function() {
        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.domElement.id = "canvas-gl";

        let self = this;
        $(window).on('resize', function() {
            self.updateSize();
        });

        this.updateSize();
        requestAnimationFrame(render);
    }

    this.getCanvas = function() {
        return renderer.domElement;
    }

    let render = function() {
        requestAnimationFrame(render);

        if (!Config.drawParticles) {
            return;
        }

        renderer.render(Scene.glScene, Scene.glCamera);
    }

    this.updateSize = function() {
        let width = $('.visual-preview').width();
        let height = $('.visual-preview').height();

        renderer.setSize(width, height);

        // Update camera aspect ratio to avoid distortion
        Scene.glCamera.aspect = width / height;
        Scene.glCamera.updateProjectionMatrix();
    }

};
