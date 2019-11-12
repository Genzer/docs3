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

const fetchS3Object = async (req, res) => {
  const s3 = new AWS.S3({});
  const getFile = promisify(s3.getObject).bind(s3);

  const options = {
    Bucket: bucket,
    // Remove the first slash
    Key: req.url.substr(1),
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
      res.status(404);
      res.send(`Sorry! Cannot find any file at ${options.Key}`);
      return;
    }
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


app.get('/*', tryIfError(fetchS3Object));
app.use(resWithError);

app.listen(port,
    () => LOG.info(`docs3 is running at ${ port } serving Bucket ${ bucket }`));
