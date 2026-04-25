// Change this value to switch environments. Set to null to use defaults from cypress.config.js.
const activeEnvironment = null;

const environments = {
  'example-env': {
    baseUrl: 'https://your-environment-url.example.org',
    env: {
      OKAPI_HOST: 'https://your-kong-or-okapi-url.example.org',
      OKAPI_TENANT: 'your_tenant',
      diku_login: 'your_login',
      diku_password: 'your_password',
      // Optional overrides (only include what differs from defaults in cypress.config.js):
      // EDGE_HOST: 'https://edge-url.example.org',
      // EDGE_API_KEY: '',
      // rtrAuth: false,
      // ecsEnabled: true,
      // eureka: true,
      // systemRoleName: 'EBSCOAdminRole',
      // ecs_env_name: 'snapshot',
    },
  },
};

module.exports = { activeEnvironment, environments };
