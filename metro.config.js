const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const rnwPath = fs.realpathSync(
  path.resolve(require.resolve('react-native-windows/package.json'), '..'),
);

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  new RegExp(
    `${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`,
  ),
  new RegExp(`${rnwPath}/build/.*`),
  new RegExp(`${rnwPath}/target/.*`),
  /.*\.ProjectImports\.zip/,
];

module.exports = config;
