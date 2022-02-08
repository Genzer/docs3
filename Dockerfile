FROM node:14.19.0-alpine3.15

LABEL org.opencontainers.version="SHOULD_BE_REPLACED_ON_BUILD"
LABEL org.opencontainers.image.description="A simple static web server for S3"

RUN apk add --no-cache --update tini \
    && rm -rf /var/cache/apk/*

ENTRYPOINT ["/sbin/tini", "--"]

RUN addgroup -g 3000 docs3 \
	&& adduser -D -g GECOS -G docs3 -u 3000 docs3 \
    && mkdir -p /apps/docs3 \
    && chown -R docs3:docs3 /apps/docs3

WORKDIR /apps/docs3
USER docs3

COPY --chown=docs3:docs3 . /apps/docs3/

RUN npm install --production

CMD ["node", "app.js"]

