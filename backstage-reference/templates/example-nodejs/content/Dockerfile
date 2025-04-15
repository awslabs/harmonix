FROM node:22

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY "src/package.json" ./

RUN yarn install

# Bundle app source
COPY . .

EXPOSE ${{ values.appPort }}
CMD [ "node", "src/index.js" ]
