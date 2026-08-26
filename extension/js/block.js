document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url');
  const threat = params.get('threat');
  const message = params.get('message');

  if (url) document.getElementById('originalUrl').textContent = url;
  if (threat) document.getElementById('threatType').textContent = threat;
  if (message) document.getElementById('message').textContent = message;

  document.getElementById('goBack').addEventListener('click', () => {
    // Attempt to go back in history, or close tab
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  document.getElementById('proceed').addEventListener('click', () => {
    if (url) {
      chrome.runtime.sendMessage({ action: 'ALLOW_URL', url: url });
      window.location.href = url;
    }
  });
});
