let Background = new function() {

    let bgTimer;
    let customBg = false;
    let lastUrl;
    let currentBgImage;
    let redditPosts = [];
    let redditPostIndex = 0;
    let imgurImages = [];
    let imgurImageIndex = 0;

    const staticUrls = [
        'UQtp3P3', '7Z298jY', 'yhmg3bF', 'Uv9124L', 'KhYQp6n'
    ];

    let handleRedditFail = function() {
        console.log("Failed to load backgrounds from Reddit, are we offline?");
    };

    let handleRedditData = function(data) {
        redditPosts = data.data.children;
        loadNextRedditPost();
    };

    let loadNextRedditPost = function() {
        if (redditPosts.length === 0) {
            return;
        }
        if (redditPostIndex >= redditPosts.length) {
            redditPostIndex = 0;
        }
        let post = redditPosts[redditPostIndex++];
        let data = post.data;
        if (data.stickied || data.spoiler || data.url.indexOf('i.redd.it') === -1) {
            loadNextRedditPost();
            return;
        }
        setBackground(data.url);
    };

    let handleImgurFail = function() {
        console.log("Failed to load backgrounds from Imgur, falling back to static list");
        loadStaticBackground();
    };

    let handleImgurData = function(data) {
        imgurImages = data.data;
        loadNextImgurImage();
    };

    let loadNextImgurImage = function() {
        if (imgurImages.length === 0) {
            return;
        }
        if (imgurImageIndex >= imgurImages.length) {
            imgurImageIndex = 0;
        }
        let image = imgurImages[imgurImageIndex++];
        setBackground(image.link);
    };

    let setBackground = function(newUrl) {
        if (!newUrl || newUrl === lastUrl) {
            return;
        }
        lastUrl = newUrl;
        let bgImage = new Image();
        bgImage.crossOrigin = "Anonymous";
        bgImage.onload = () => {
            currentBgImage = bgImage;
        }
        bgImage.src = newUrl;
    };

    let loadRedditBackground = function() {
        $.ajax({
            url: `https://www.reddit.com/r/${Config.backgroundSubreddit.toLowerCase()}.json`,
            method: "GET",
            success: handleRedditData,
            error: handleRedditFail
        });
    };

    let loadImgurBackground = function(allowFallback) {
        $.ajax({
            url: `https://api.imgur.com/3/gallery/r/${Config.backgroundSubreddit.toLowerCase()}/0`,
            method: "GET",
            headers: {
                Authorization: "Client-ID 0428dcb72fbc5da",
                Accept: "application/json"
            },
            success: handleImgurData,
            error: allowFallback ? handleImgurFail : null
        });
    };

    let loadStaticBackground = function() {
        let id = staticUrls[Math.floor(Math.random() * staticUrls.length)];
        setBackground(`http://i.imgur.com/${id}.jpg`);
    };

    let publicApi = {};

    publicApi.setUp = function() {
        if (!Config.forceStaticBackground) {
            bgTimer = setInterval(() => {
                if (!customBg) {
                    if (Config.forceImgurBackground) {
                        loadImgurBackground(true);
                    } else {
                        loadRedditBackground();
                    }
                }
            }, 60 * 1000);
        }
    };

    publicApi.loadInitial = function() {
        publicApi.resetBG();
    };

    publicApi.setCustomBackground = function(imageData) {
        console.log("cutom image")
        customBg = true;
        setBackground(imageData);
    };

    publicApi.resetBG = function() {
        customBg = false;
        if (Config.forceStaticBackground) {
            loadStaticBackground();
        } else if (Config.forceImgurBackground) {
            loadImgurBackground(false);
        } else {
            loadRedditBackground();
        }
    };

    publicApi.getBackgroundImage = function() {
        return currentBgImage;
    };

    return publicApi;
}();
