let Background = (function() {

    const BG_CHANGE_TIME = 2000;

    let bgElement1, bgElement2, lowResElement1, lowResElement2;
    let currentBg = 1;
    let bgTimer;
    let customBg = false;

    let staticUrls = [
        "Wo92x3p", "n5nUa5Q", "oB5y82s", "Vj8sA0Y", "WBh1i5F", "fWfVz7w",
        "8i3nJ56", "4rR62o7", "rgrgSjY", "z3d3bso", "JGIkYpA", "Jv2mvfS"
    ];

    let setBackground = function(fullRes, lowRes) {
        // console.log("image: ", fullRes)
        // Reset opacity and display for the fade-in effect
        bgElement1.style.opacity = 0;
        bgElement2.style.opacity = 0;
        bgElement1.style.display = "";
        bgElement2.style.display = "";

        lowResElement1.style.display = "";
        lowResElement2.style.display = "";

        // Set sources
        bgElement1.src = fullRes;
        bgElement2.src = fullRes; // Both img tags get the same source

        // console.log("bgElement1: ", bgElement1.src)
        // console.log("bgElement2: ", bgElement2.src)


        if (lowRes) {
            lowResElement1.src = lowRes;
            lowResElement2.src = lowRes;
        } else {
            lowResElement1.src = fullRes;
            lowResElement2.src = fullRes;
        }
    };

    let loadRedditBackground = function() {
        let handleRedditData = function(data) {
            if (customBg) return;
            if (!data.data || !data.data.children || data.data.children.length < 1) {
                return handleRedditFail();
            }

            let posts = data.data.children.filter(p => p.kind == "t3" && p.data.post_hint == "image" && !p.data.is_video);
            if (posts.length < 1) {
                return handleRedditFail();
            }
            let post = posts[Math.floor(Math.random() * posts.length)];
            let smol = post.data.preview.images[0].resolutions[1].url.replaceAll("&amp;", "&");
            let full = post.data.url.replaceAll("&amp;", "&");

            setBackground(full, smol);
        }

        let handleRedditFail = function() {
            console.error("Reddit API failed; falling back to Imgur...");
            loadImgurBackground();
        }

        $.ajax({
            url: `https://www.reddit.com/r/${Config.backgroundSubreddit.toLowerCase()}/hot.json`,
            method: "GET",
            success: handleRedditData,
            error: handleRedditFail
        });
    };

    let loadImgurBackground = function(allowFallback = true) {
        let handleImgurData = function(data) {
            if (customBg) return;
            if (!data.data || data.data.length < 1) {
                return allowFallback ? handleImgurFail() : null;
            }

            let posts = data.data.filter(p => !p.in_most_viral && !p.animated && p.type == "image/jpeg");
            if (posts.length < 1) {
                return allowFallback ? handleImgurFail() : null;
            }

            let post = posts[Math.floor(Math.random() * posts.length)];
            setBackground(post.link, post.link.replace(".jpg", "m.jpg"));
        }

        let handleImgurFail = function() {
            console.error("Imgur API failed; falling back to static background...");
            loadStaticBackground();
        }

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
        setBackground(`http://i.imgur.com/${id}.jpg`, `http://i.imgur.com/${id}m.jpg`);
    };

    // Public methods
    let publicApi = {};

    publicApi.setUp = function() {
        bgElement1 = document.getElementById("bgimg1");
        bgElement2 = document.getElementById("bgimg2");
        lowResElement1 = document.getElementById("limg1");
        lowResElement2 = document.getElementById("limg2");

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

    publicApi.flipImage = function() {
        let current = currentBg == 1 ? bgElement1 : bgElement2;
        let other = currentBg == 1 ? bgElement2 : bgElement1;

        let currentLow = currentBg == 1 ? lowResElement1 : lowResElement2;
        let otherLow = currentBg == 1 ? lowResElement2 : lowResElement1;

        other.style.zIndex = 2;
        current.style.zIndex = 1;
        otherLow.style.zIndex = 2;
        currentLow.style.zIndex = 1;

        other.style.opacity = 1;
        otherLow.style.opacity = 1;

        currentBg = currentBg == 1 ? 2 : 1;

        setTimeout(() => {
            current.style.opacity = 0;
            currentLow.style.opacity = 0;
        }, BG_CHANGE_TIME);
    };

    publicApi.fadeFullRes = function(element) {
        $(element).animate({ opacity: 1 }, BG_CHANGE_TIME);
    };

    return publicApi;
})();