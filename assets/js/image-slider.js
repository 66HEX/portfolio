let items = document.querySelectorAll('.slider .slider-card');
let active = 2;
let initialX = null;
let swipeThreshold = 100; // Adjust as needed
function loadShow() {
    const totalItems = items.length;
    const activeItem = items[active];
    // Reset active item styles
    activeItem.style.transform = 'none';
    activeItem.style.zIndex = 1;
    activeItem.style.filter = 'none';
    activeItem.style.opacity = 1;
    // Precompute the styles to avoid recalculating in the loops
    const nextTransforms = [];
    const prevTransforms = [];
    for (let stt = 1; stt < totalItems; stt++) {
        nextTransforms.push({
            transform: `translateX(${150 * stt}px) scale(${1 - 0.2 * stt}) perspective(16px) rotateY(-1deg)`,
            zIndex: -stt,
            filter: 'blur(5px)',
            opacity: stt > 2 ? 0 : 0.6
        });
        prevTransforms.push({
            transform: `translateX(${-150 * stt}px) scale(${1 - 0.2 * stt}) perspective(16px) rotateY(1deg)`,
            zIndex: -stt,
            filter: 'blur(5px)',
            opacity: stt > 2 ? 0 : 0.6
        });
    }
    // Apply styles to the next items
    for (let i = active + 1, stt = 0; i < totalItems; i++, stt++) {
        Object.assign(items[i].style, nextTransforms[stt]);
    }
    // Apply styles to the previous items
    for (let i = active - 1, stt = 0; i >= 0; i--, stt++) {
        Object.assign(items[i].style, prevTransforms[stt]);
    }
}
// Use requestAnimationFrame for better performance
requestAnimationFrame(loadShow);
// Touch event handlers
let slider = document.querySelector('.slider');
slider.addEventListener('touchstart', function(e) {
    initialX = e.touches[0].clientX;
});
slider.addEventListener('touchmove', function(e) {
    if (initialX === null) {
        return;
    }
    let currentX = e.touches[0].clientX;
    let deltaX = currentX - initialX;
    // Adjust active based on swipe direction
    if (deltaX > swipeThreshold) {
        active = active - 1 >= 0 ? active - 1 : active;
        initialX = currentX; // Reset initialX for continuous swipe
        loadShow();
    } else if (deltaX < -swipeThreshold) {
        active = active + 1 < items.length ? active + 1 : active;
        initialX = currentX; // Reset initialX for continuous swipe
        loadShow();
    }
});
slider.addEventListener('touchend', function() {
    initialX = null;
});
// Button click handlers
let next = document.getElementById('slider-card-button-next');
let prev = document.getElementById('slider-card-button-prev');
next.onclick = function() {
    active = active + 1 < items.length ? active + 1 : active;
    loadShow();
}
prev.onclick = function() {
    active = active - 1 >= 0 ? active - 1 : active;
    loadShow();
}
