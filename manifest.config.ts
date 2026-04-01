import manifest from './manifest.base.json';
import packageJson from './package.json';

export default {
  ...manifest,
  version: packageJson.version
};
