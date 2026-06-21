function chamarApi(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const callbackName =
      'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);

    const params = new URLSearchParams({
      action,
      callback: callbackName,
      payload: JSON.stringify(payload)
    });

    const script = document.createElement('script');
    script.src = `${APP_CONFIG.API_URL}?${params.toString()}`;

    window[callbackName] = function (response) {
      cleanup();
      resolve(response);
    };

    script.onerror = function () {
      cleanup();
      reject(new Error('Não foi possível conectar à API.'));
    };

    function cleanup() {
      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    document.body.appendChild(script);
  });
}
