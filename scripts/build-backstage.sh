echo "Building the backstage app"
cd backstage/
yarn tsc
yarn build:all
# yarn build-image
docker build . -f ../config/Dockerfile --tag backstage
cd -
echo "Backstage app build finished"