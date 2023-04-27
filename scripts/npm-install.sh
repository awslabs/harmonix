echo "Initializing the infrastructure development environment"
cd infrastructure/
yarn install
cd -
echo "Initializing the backstage development environment"
cd backstage/
yarn install
yarn tsc
cd -
echo "Development environment initialization finished"