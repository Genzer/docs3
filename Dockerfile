FROM node:14.19.0-alpine3.15

LABEL org.opencontainers.version="SHOULD_BE_REPLACED_ON_BUILD"
LABEL org.opencontainers.image.description="A simple static web server for S3"

RUN apk add --no-cache --update \
    && rm -rf /var/cache/apk/*

RUN addgroup -g 3000 docs3 \
	&& adduser -D -g GECOS -G docs3 -u 3000 docs3 \
    && mkdir -p /apps/docs3 \
    && chown -R docs3:docs3 /apps/docs3
    
# Add Tini
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /usr/local/bin/tini
RUN chmod +x /usr/local/bin/tini
ENTRYPOINT ["tini", "--"]

WORKDIR /apps/docs3
USER docs3

COPY --chown=docs3:docs3 . /apps/docs3/

RUN npm install --production

CMD ["node", "app.js"]

