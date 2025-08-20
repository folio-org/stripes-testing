import uuid from 'uuid';

const defaultPOLLimitConfig = {
  key: 'poLines-limit',
  value: '1',
  id: uuid(),
};
const defaultSearchParams = { query: '(key=poLines-limit)' };

export default {
  getPOLLimit(searchParams) {
    return cy
      .okapiRequest({
        path: 'orders-storage/settings',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.settings);
  },
  createPOLLimit(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders-storage/settings',
        body: config,
      })
      .then(({ body }) => body);
  },
  updatePOLLimit(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `orders-storage/settings/${config.id}`,
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
