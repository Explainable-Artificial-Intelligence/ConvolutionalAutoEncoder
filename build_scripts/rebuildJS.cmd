cd ../swagger_client

npm install
npm link

cd ../website/js

npm link ../../swagger_client/

browserify --debug load.js -o load_bundle.js
browserify --debug build.js -o build_bundle.js
browserify --debug train.js -o train_bundle.js
browserify --debug tune.js -o tune_bundle.js