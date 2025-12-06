const express = require('express');
const fileUpload = require('express-fileupload');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Paths relative to the server directory
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(os.tmpdir(), 'snapdrop-uploads');
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
const reactIndexHtml = path.join(clientDistDir, 'index.html');

// Middleware: serve static assets from the server/public directory
app.use(express.static(publicDir));

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

// Ensure uploads and temp directories exist on startup
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
} catch (e) {
  console.error('Failed to initialize uploads directory:', e);
}

// Configure file upload middleware with safer defaults
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: tempDir,
    createParentPath: true,
    safeFileNames: true,
    preserveExtension: true
  })
);

// Routes
app.get('/', (req, res) => {
  if (fs.existsSync(reactIndexHtml)) {
    return res.sendFile(reactIndexHtml);
  }

  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/upload', (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    let uploadedFile = req.files.file;
    if (Array.isArray(uploadedFile)) {
      uploadedFile = uploadedFile[0];
    }

    if (!uploadedFile || !uploadedFile.name) {
      return res.status(400).send('Invalid upload payload.');
    }

    // Sanitize filename and avoid path traversal
    const originalName = path.basename(uploadedFile.name);
    const safeName = originalName.replace(/[\0<>:"/\\|?*]+/g, '_');

    // Ensure uploads dir still exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Avoid overwriting existing files: add timestamp if conflict
    let targetPath = path.join(uploadsDir, safeName);
    if (fs.existsSync(targetPath)) {
      const ext = path.extname(safeName);
      const base = path.basename(safeName, ext);
      const uniqueName = `${base}-${Date.now()}${ext}`;
      targetPath = path.join(uploadsDir, uniqueName);
    }

    uploadedFile.mv(targetPath, (err) => {
      if (err) {
        const message = err?.message || String(err);
        return res.status(500).send(message);
      }
      res.send('File uploaded!');
    });
  } catch (e) {
    return res.status(500).send('Unexpected server error.');
  }
});

app.get('/files', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      return res.json([]);
    }
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Failed to read uploads directory.');
      }
      return res.json(files.filter(Boolean));
    });
  } catch (e) {
    return res.status(500).send('Failed to list files.');
  }
});

app.get('/files/meta', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      return res.json([]);
    }

    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Failed to read uploads directory.');
      }

      const entries = [];
      for (const name of files.filter(Boolean)) {
        try {
          const fullPath = path.join(uploadsDir, name);
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            entries.push({
              name,
              size: stat.size,
              mtimeMs: stat.mtimeMs
            });
          }
        } catch (e) {
          // Skip problematic entries but do not fail the entire response.
          continue;
        }
      }

      return res.json(entries);
    });
  } catch (e) {
    return res.status(500).send('Failed to list files.');
  }
});

app.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

	  res.download(filePath, filename, (err) => {
	    if (err) {
	      // If headers are already sent (e.g., client aborted mid-download),
	      // just log the error instead of trying to send another response.
	      if (res.headersSent || res.writableEnded) {
	        console.error('Download error after headers sent:', err);
	        return;
	      }

	      // For aborted connections, don't treat it as a server failure.
	      if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') {
	        console.warn('Download aborted by client:', err.message);
	        return;
	      }

	      return res.status(500).send('Failed to download file');
    }
  });
});

app.delete('/files', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.send('No uploaded files to clear.');
    }

    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          fs.unlinkSync(filePath);
          deletedCount += 1;
        }
      } catch (e) {
        console.error('Failed to delete file while clearing all:', filePath, e);
      }
    });

    return res.send(
      deletedCount === 0
        ? 'No uploaded files to clear.'
        : `Deleted ${deletedCount} uploaded file(s).`
    );
  } catch (e) {
    console.error('Failed to clear uploaded files directory:', e);
    return res.status(500).send('Failed to clear all uploaded files.');
  }
});

app.delete('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).send('Failed to delete file');
    }
    res.send('File deleted');
  });
});

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    const addresses = interfaces[name];
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return '127.0.0.1';
}

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Access the app at http://${getLocalIP()}:${port}`);
});
