var s3 = require('s3');
var ls = require('ls');
var mv = require('mv');
var watch = require('watch');
var s = require("underscore.string");


// Credentials are located in credentials file as per https://aws.amazon.com/sdk-for-node-js/
var client = s3.createClient();

const path = process.env['IMG_PATH'] || '/tmp/selfies/';
const uploadingFolder = path + 'uploading/';
const failedFolder = path + 'failed/';
const uploadedFolder = path + 'uploaded/';
const pathWithPattern = path + '*.jpg';

if (ls(pathWithPattern).length === 0) {
    console.log('No images found in ' + pathWithPattern);
}

// Upload all existing files
ls(pathWithPattern, { recursive:false }, function(file) {
    uploadFile(file.full);
});

// Upload any files that appear
watch.createMonitor(path, function (monitor) {
    monitor.on("created", function (file) {
        if (s(file).startsWith(uploadedFolder)
            || s(file).startsWith(uploadingFolder)
            || s(file).startsWith(failedFolder)) {
            return;
        }

        uploadFile(file);
    });
});

function uploadFile(file) {
    if (!s(file).endsWith('.jpg')) return;

    var originalPath = file;
    var fileName = s(originalPath).strRightBack('/').value();
    var uploadingPath = uploadingFolder + fileName;
    var failedPath = failedFolder + fileName;
    var uploadedPath = uploadedFolder + fileName;

    console.log('Uploading ' + originalPath);
    mv(originalPath, uploadingPath, { mkdirp: true }, function(err) {
        if (err) {
            console.error('Unable to move file from ' + originalPath + " to " + uploadingPath, err);
            return;
        }

        var uploader = client.uploadFile({
            localFile: uploadingPath,

            s3Params: {
                Bucket: 'lillesand-selfies',
                Key: fileName
            }
        });

        uploader.on('error', function(err) {
            if (err) {
                console.error('Uploading of ' + originalPath + ' failed. Moving to ' + failedPath, err);
            }
            mv(uploadingPath, failedPath, { mkdirp: true }, function() {});
        });

        uploader.on('progress', function() {
            //console.log("progress", uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal);
        });

        uploader.on('end', function() {
            console.log('Successfully uploaded ' + uploadingPath + '. Moving to ' + uploadedPath);
            mv(uploadingPath, uploadedPath, { mkdirp: true }, function() {});
        });

    });

}
