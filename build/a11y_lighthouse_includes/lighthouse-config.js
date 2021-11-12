module.exports = {
  extends: 'lighthouse:default',
  settings: {
    skipAudits: [
      'redirects-http',
      'no-unload-listeners',
      'errors-in-console',
      'uses-long-cache-ttl',
      'unsized-images'
    ]
  }
};