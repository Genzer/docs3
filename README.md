# docs3 - Docs on S3

**DEPRECATION NOTICE**
This repository is no longer maintained. I advised you to use https://github.com/nginxinc/nginx-s3-gateway instead.

This repository aims to serve static files stored in AWS S3 Bucket through a very simple HTTP API.

The reason for this module is that I want to host some static websites (mainly documentations) but I don't want to use make my Bucket _publicly read from the Internet_.

## Prerequisites

- AWS Credentials. Or if you are running using the EC2 IAM Role which has been granted to access to S3.
- Node.js v10

## Getting Started

1 - Install all packages.

```sh
npm install
```

2 - Serve

```sh
AWS_BUCKET_NAME=your-bucket-name node app.js
```
