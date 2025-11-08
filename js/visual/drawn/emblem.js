let Emblem = new function() {

    let image;
    let loaded = false;
    let currentRadius;

    this.setUp = function() {
        image = new Image();
        image.onload = () => loaded = true;
        image.src = "./img/emblem.svg";

        Callbacks.addCallback(drawCallback);
    }

    this.setEmblem = function(src) {
        loaded = false;
        image.src = src;
        image.onload = () => loaded = true;
    }

    let drawCallback = function(_, multiplier) {
        if (!Config.drawEmblem || typeof Canvas === 'undefined' || !Canvas.context) {
            return;
        }

        if (!loaded) {
            return;
        }

        currentRadius = Emblem.calcRadius(multiplier);

        // Center the emblem based on the canvas dimensions
        let xOffset = Canvas.canvas.width / 2;
        let yOffset = Canvas.canvas.height / 2;

        Canvas.context.save(); // Save the current state
        Canvas.context.beginPath(); // Start a new path
        Canvas.context.arc(xOffset, yOffset, currentRadius, 0, Math.PI * 2, true); // Create a circular path
        Canvas.context.closePath(); // Close the path
        Canvas.context.clip(); // Clip to the path

        Canvas.context.drawImage(image, xOffset - currentRadius, yOffset - currentRadius, currentRadius * 2, currentRadius * 2);

        Canvas.context.restore(); // Restore the original state
    }

    this.calcRadius = function(multiplier) {
        if (typeof Canvas === 'undefined' || !Canvas.canvas) return 0;
        let minDim = Math.min(Canvas.canvas.width, Canvas.canvas.height);
        // A simpler radius calculation for debugging
        let baseRadius = minDim * 0.30;
        let dynamicRadius = minDim * 0.05 * multiplier;
        return baseRadius + dynamicRadius;
    }

};