FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY "src/package.json" ./

RUN yarn install

# Bundle app source
COPY . .

# Specify a non-root user
USER nobody

EXPOSE ${{ values.appPort }}
CMD [ "node", "src/index.js" ]
