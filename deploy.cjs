
const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const sftp = new SftpClient();

const config = {
    host: '149.28.200.205',
    username: 'antig',
    password: 'AntiG95%!*_!!!',
    port: 22
};

async function deploy() {
    try {
        console.log('Connecting to SFTP...');
        await sftp.connect(config);
        console.log('Connected!');

        const localDist = path.join(__dirname, 'dist');
        const remoteRoot = 'public_html';


        console.log(`Uploading ${localDist} to ${remoteRoot}...`);

        // SPA 404 Hack for Nginx/Static servers: Copy index.html to 404.html
        // This ensures that if the server returns 404, it serves the app, and React Router takes over.
        const fs = require('fs');
        const indexHtml = path.join(localDist, 'index.html');
        const notFoundHtml = path.join(localDist, '404.html');
        fs.copyFileSync(indexHtml, notFoundHtml);
        console.log('Created 404.html fallback.');


        // Custom filter to skip uploading .htaccess if it was in dist (it shouldn't be, but good practice)
        // Actually uploadDir uploads everything.

        sftp.on('upload', info => {
            console.log(`Uploaded ${info.source}`);
        });

        await sftp.uploadDir(localDist, remoteRoot);
        console.log('Dist folder uploaded successfully.');

        // Now upload .htaccess explicitly
        console.log('Uploading .htaccess...');
        await sftp.put(path.join(__dirname, '.htaccess'), 'public_html/.htaccess');
        console.log('.htaccess uploaded.');

        await sftp.end();
        console.log('Deployment complete!');
    } catch (err) {
        console.error('Deployment Error:', err.message);
    }
}

deploy();
