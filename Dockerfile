FROM node:10.17.0-alpine

LABEL maintainer="genzer.hawker@gmail.com"
LABEL version="0.1.0"
LABEL description="A simple static web server for S3"

RUN apk add --no-cache --update \
    && rm -rf /var/cache/apk/*

RUN addgroup -g 3000 docs3 \
	&& adduser -D -g GECOS -G docs3 -u 3000 docs3 \
    && mkdir -p /apps/docs3 \
    && chown -R docs3:docs3 /apps/docs3

WORKDIR /apps/docs3

COPY --chown=docs3:docs3 .  /apps/docs3/

RUN npm install --production

CMD ["node", "app.js"]

