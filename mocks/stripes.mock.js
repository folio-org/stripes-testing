import { noop } from 'lodash';

const buildStripes = (otherProperties = {}) => ({
  hasPerm: noop,
  hasInterface: noop,
  clone: noop,
  logger: { log: noop },
  config: {},
  okapi: {
    url: '',
    tenant: '',
  },
  locale: 'en-US',
  withOkapi: true,
  setToken: noop,
  actionNames: [],
  setLocale: noop,
  setTimezone: noop,
  setCurrency: noop,
  setSinglePlugin: noop,
  setBindings: noop,
  connect: noop,
  ...otherProperties,
});

export default buildStripes;
