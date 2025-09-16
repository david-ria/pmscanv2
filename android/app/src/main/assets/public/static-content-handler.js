// Hide static content when React takes over (non-critical)
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var staticContent = document.querySelector('#root > div');
    if (staticContent && window.React) {
      staticContent.style.display = 'none';
    }
  }, 100);
});