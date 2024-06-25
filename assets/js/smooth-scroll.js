function init() {
    const smoothScrollInstance = new SmoothScroll(document, 150, 25);
    // Queue for navbar clicks
    var navbarQueue = [];
    var navbarMoving = false;
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            // Enqueue the scroll animation for navbar clicks
            navbarQueue.push({ targetElement: targetElement });
            // Process the queue if not already moving
            if (!navbarMoving) {
                processNavbarQueue();
            }
        });
    });
    function processNavbarQueue() {
        if (navbarQueue.length > 0) {
            var nextScroll = navbarQueue.shift();
            navbarMoving = true;
            smoothScrollInstance.scrollTo(nextScroll.targetElement, function() {
                navbarMoving = false;
                processNavbarQueue(); // Continue to next animation in queue
            });
        } else {
            navbarMoving = false;
        }
    }
}
function SmoothScroll(target, speed, smooth) {
    if (target === document)
        target =
            document.scrollingElement ||
            document.documentElement ||
            document.body.parentNode ||
            document.body; // cross browser support for document scrolling
    var moving = false;
    var pos = target.scrollTop;
    var frame =
        target === document.body && document.documentElement
            ? document.documentElement
            : target; // safari is the new IE
    target.addEventListener("mousewheel", scrolled, { passive: false });
    target.addEventListener("DOMMouseScroll", scrolled, { passive: false });
    function scrolled(e) {
        if (e.target.closest('nav')) {
            // Allow default behavior for nav elements
            return;
        }
        e.preventDefault(); // disable default scrolling
        var delta = normalizeWheelDelta(e);
        pos += -delta * speed;
        pos = Math.max(0, Math.min(pos, target.scrollHeight - frame.clientHeight)); // limit scrolling
        if (!moving) update();
    }
    function normalizeWheelDelta(e) {
        if (e.detail) {
            if (e.wheelDelta)
                return (e.wheelDelta / e.detail / 40) * (e.detail > 0 ? 1 : -1);
            // Opera
            else return -e.detail / 3; // Firefox
        } else return e.wheelDelta / 120; // IE,Safari,Chrome
    }
    function update() {
        moving = true;
        var delta = (pos - target.scrollTop) / smooth;
        target.scrollTop += delta;
        if (Math.abs(delta) > 0.5) requestFrame(update);
        else moving = false;
    }
    var requestFrame = (function () {
        // requestAnimationFrame cross browser
        return (
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (func) {
                window.setTimeout(func, 1000 / 50);
            }
        );
    })();
    this.scrollTo = function(targetElement, callback) {
        var targetPos = targetElement.getBoundingClientRect().top + pos;
        function animateScroll() {
            var delta = (targetPos - pos) / smooth;
            pos += delta;
            target.scrollTop = pos;
            if (Math.abs(delta) > 0.5) {
                requestFrame(animateScroll);
            } else {
                moving = false;
                if (callback) callback();
            }
        }
        animateScroll();
    };
}
window.addEventListener("DOMContentLoaded", init);