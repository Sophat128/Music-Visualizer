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

    window.onload = this.init;
    window.onresize = this.resizeCallback;
}
