const express = require('express');
const AWS = require('aws-sdk');
const winston = require('winston');
const {promisify} = require('util');

const {combine, timestamp, label, printf, splat} = winston.format;
const myFormat = printf(({level, message, label, timestamp}) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});
const LOG = winston.createLogger({
  level: 'debug',
  format: combine(
      label({label: 'app.js'}),
      timestamp(),
      splat(),
      myFormat,
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

const app = express();
app.set('strict routing', true);

const port = 3000;

const bucket = process.env.AWS_BUCKET_NAME;

const randomString = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const resWithError = (error, req, res, next) => {
  const errorId = randomString();
  LOG.error('%o', {errorId, error});
  res.status(500).send({errorId: errorId});
};

const tryIfError = (middleware) => async (req, res, next) => {
  try {
    await middleware(req, res, next);
  } catch (error) {
    next(error);
  }
};

// HACK:
// ----
// 
// According to a comment in GitHub issue #3005 [1] of aws-sdk-js, setting
// disableFetchToken could reduce the time accessing S3 on EC2 instances
// using IAM Role.
//
// [1]: https://github.com/aws/aws-sdk-js/issues/3005#issuecomment-768219394
//
AWS.config.credentials = new AWS.EC2MetadataCredentials({ disableFetchToken: true });

const fetchS3Object = async (req, res) => {
  const s3 = new AWS.S3({});
  const getFile = promisify(s3.getObject).bind(s3);

  const key = req.url.endsWith('/') ? `${req.url}index.html` : req.url;
  const options = {
    Bucket: bucket,
    // Remove the first slash
    Key: key.substr(1),
  };

  LOG.info(`Fetching ${ options.Bucket }/${ options.Key }`);

  let object;
  try {
    object = await getFile(options);
    LOG.debug('Result %o', object);
  } catch (error) {
    const {code} = error;
    if (code === 'NoSuchKey') {
      LOG.error('NoSuchkey %o', error);
      res.writeHead(404, {
        'Content-Type': 'text/html',
      });
      const suggestion =
        req.url.endsWith('/') ?
          '' :
          `<p>Did you mean <a href="${req.url}/">${req.url}/</a> instead?</p>`;
      res.end(`
      <!doctype html>
        <html>
          <body>
            <p>Sorry! Cannot find any file at ${req.url}.<p>
            ${suggestion}
          </body>
        </html>`);
      return;
    }
    throw error;
  }

  if (object.ContentType === 'application/x-directory') {
    res.redirect(`${req.url }index.html`);
    return;
  }

  res.set({
    'Content-Type': object.ContentType,
    'ETag': object.ETag,
    'Content-Length': object.ContentLength,
  });

  res.send(object.Body);
};


app.use('/', express.static('start-page'));
app.use('/repos.json', async (req, res) => {
  const s3 = new AWS.S3({});
  const listFirstLevelDirectories = promisify(s3.listObjectsV2).bind(s3);

  const options = {
    Bucket: bucket,
    Delimiter: '/',
  };

  const result = await listFirstLevelDirectories(options);
  const pages = result.CommonPrefixes
      .map((folder) => ({
        name: folder.Prefix,
        url: `${folder.Prefix}`,
      }));

  res.writeHead(200, {
    'Content-Type': 'application/json',
  });

  res.end(JSON.stringify(pages));
  return;
});

app.get('/*', tryIfError(fetchS3Object));
app.use(resWithError);

app.listen(port,
    () => LOG.info(`docs3 is running at ${ port } serving Bucket ${ bucket }`));
