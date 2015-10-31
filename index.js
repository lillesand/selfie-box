var s3 = require('s3');
var ls = require('ls');
var mv = require('mv');

// Credentials are located in credentials file as per https://aws.amazon.com/sdk-for-node-js/
var client = s3.createClient();

var path = process.env['IMG_PATH'] || '/tmp/selfies';
var imagePattern = path + '/*.jpg';

if (ls(imagePattern).length === 0) {
    console.log('No images found in ' + imagePattern)
}

ls(imagePattern, {recursive:false}, function(file) {
    var originalPath = file.full;
    var uploadingPath = path + '/uploading/' + file.file;
    var failedPath = path + '/failed/' + file.file;
    var uploadedPath = path + '/uploaded/' + file.file;

    mv(originalPath, uploadingPath, { mkdirp: true }, function(err) {
        if (err) {
            console.error('Unable to copy file', err);
            // Seriously bad news, do nothing.
            return;
        }

        var uploader = client.uploadFile({
            localFile: uploadingPath,

            s3Params: {
                Bucket: 'lillesand-selfies',
                Key: file.name
            }
        });

        uploader.on('error', function(err) {
            if (err) {
                console.error('Uploading of ' + originalPath + ' failed. Moving to ' + failedPath, err);
            }
            mv(uploadingPath, failedPath, { mkdirp: true }, function() {});
        });

        uploader.on('progress', function() {
            console.log("progress", uploader.progressMd5Amount,
                uploader.progressAmount, uploader.progressTotal);
        });

        uploader.on('end', function() {
            console.log('Successfully uploaded ' + uploadingPath + '. Moving to ' + uploadedPath);
            mv(uploadingPath, uploadedPath, { mkdirp: true }, function() {});
        });

    });



});