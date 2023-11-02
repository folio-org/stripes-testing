import uuid from 'uuid';

const defaultPOLLimitConfig = {
  module: 'ORDERS',
  configName: 'poLines-limit',
  value: '1',
  id: uuid(),
};
const defaultSearchParams = { query: '(module==ORDERS and configName==poLines-limit)' };

export default {
  getPOLLimit(searchParams) {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.configs);
  },
  createPOLLimit(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: config,
      })
      .then(({ body }) => body);
  },
  updatePOLLimit(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${config.id}`,
      body: config,
      isDefaultSearchParamsRequired: false,
    });
  },
  setPOLLimit(limit) {
    this.getPOLLimit(defaultSearchParams).then((configs) => {
      if (configs.length) {
        this.updatePOLLimit({ ...configs[0], value: limit });
      } else {
        this.createPOLLimit({ ...defaultPOLLimitConfig, value: limit });
      }
    });
  },
};
