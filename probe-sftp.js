
const SftpClient = require('ssh2-sftp-client');
const sftp = new SftpClient();

const config = {
    host: '149.28.200.205',
    username: 'antig',
    password: 'AntiG95%!*_!!!',
    port: 22
};

async function probe() {
    try {
        console.log('Connecting to SFTP...');
        await sftp.connect(config);
        console.log('Connected!');

        const fileList = await sftp.list('.');
        console.log('--- Remote Directory Listing (Root) ---');
        console.log(fileList.map(f => `${f.type === 'd' ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n'));
        console.log('---------------------------------------');

        await sftp.end();
    } catch (err) {
        console.error('SFTP Error:', err.message);
    }
}

probe();
