#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const platform = process.platform;
const arch = process.arch;

// Map Node.js platform/arch to binary names
const platformMap = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'windows'
};

const archMap = {
  x64: 'amd64',
  arm64: 'arm64'
};

const binaryPlatform = platformMap[platform];
const binaryArch = archMap[platform === 'win32' && arch === 'x64' ? 'x64' : arch];

if (!binaryPlatform || !binaryArch) {
  console.error(`Unsupported platform: ${platform} ${arch}`);
  console.error('Please download the binary manually from:');
  console.error('https://github.com/krissss/file-browser/releases');
  process.exit(1);
}

const binaryName = platform === 'win32'
  ? `file-browser-${binaryPlatform}-${binaryArch}.exe`
  : `file-browser-${binaryPlatform}-${binaryArch}`;

const binDir = path.join(__dirname, 'bin');
const binaryPath = path.join(binDir, binaryName);

// Read version from package.json
const packageJson = require('./package.json');
const version = packageJson.version;

// Download URL - use GitHub releases
const downloadUrl = `https://github.com/krissss/file-browser/releases/download/v${version}/${binaryName}`;

console.log(`Downloading file-browser v${version} for ${platform}-${arch}...`);

// Ensure bin directory exists
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Download the binary
const file = fs.createWriteStream(binaryPath);

https.get(downloadUrl, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, downloadFile);
  } else if (response.statusCode === 200) {
    downloadFile(response);
  } else {
    console.error(`Failed to download: HTTP ${response.statusCode}`);
    console.error('Please download the binary manually from:');
    console.error('https://github.com/krissss/file-browser/releases');
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('Download failed:', err.message);
  process.exit(1);
});

function downloadFile(response) {
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    
    // Make binary executable (Unix only)
    if (platform !== 'win32') {
      fs.chmodSync(binaryPath, 0o755);
    }
    
    console.log('file-browser installed successfully!');
  });
}
