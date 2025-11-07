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

    let drawCallback = function(_, multiplier) {
        if (!Config.drawEmblem) {
            return;
        }

        if (!loaded) {
            return;
        }

        currentRadius = Emblem.calcRadius(multiplier);

        // Center the emblem based on the canvas dimensions, not the container div
        let xOffset = Canvas.canvas.width / 2 - currentRadius;
        let yOffset = Canvas.canvas.height / 2 - currentRadius;

        Canvas.context.save();
        Canvas.context.fillStyle = "#000000";
        let dimension = currentRadius * 2;
        Canvas.context.drawImage(image, xOffset, yOffset, dimension, dimension);
        Canvas.context.restore();
    }

    this.getRadius = function() {
        return currentRadius;
    }

    this.calcRadius = function(multiplier) {
        let minSize = Config.minEmblemSize;
        let maxSize = Config.maxEmblemSize;
        let scalar = multiplier * (maxSize - minSize) + minSize;
        return Util.getResolutionMultiplier() * scalar / 2;
    }

}
