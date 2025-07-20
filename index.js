const express = require('express');
const fileUpload = require('express-fileupload');
const os = require('os');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(fileUpload());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadedFile = req.files.file;
  const uploadPath = __dirname + '/uploads/' + uploadedFile.name;

  uploadedFile.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    res.send('File uploaded!');
  });
});

app.get('/files', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadsPath)) {
    return res.status(500).send('Uploads directory does not exist.');
  }

  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      return res.status(500).send('Failed to read uploads directory.');
    }

    res.json(files);
  });
});

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
  });
});

app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  const fs = require('fs');
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
  for (let interface in interfaces) {
    const addresses = interfaces[interface];
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
