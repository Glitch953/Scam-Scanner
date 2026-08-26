document.getElementById('scanBtn').addEventListener('click', async () => {
  const urlInput = document.getElementById('urlInput').value.trim();
  const resultDiv = document.getElementById('scanResult');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  if (!urlInput) {
    resultDiv.textContent = 'Please enter a URL';
    resultDiv.className = 'result danger';
    return;
  }

  // Loading state
  btnText.style.display = 'none';
  btnLoader.style.display = 'block';
  resultDiv.className = 'result';
  resultDiv.style.display = 'none';

  try {
    const response = await fetch('http://localhost:5000/api/scan/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: urlInput })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.safe) {
        resultDiv.innerHTML = `✅ <strong>Safe:</strong> This URL appears to be safe.`;
        resultDiv.className = 'result safe';
      } else {
        resultDiv.innerHTML = `⚠️ <strong>Danger:</strong> ${data.threatType || 'Malicious'} detected!`;
        resultDiv.className = 'result danger';
      }
    } else {
      resultDiv.textContent = data.error || 'Failed to scan URL';
      resultDiv.className = 'result danger';
    }
  } catch (err) {
    resultDiv.textContent = 'Connection error. Ensure the server is running.';
    resultDiv.className = 'result danger';
  } finally {
    // Reset loading state
    btnText.style.display = 'block';
    btnLoader.style.display = 'none';
  }
});
