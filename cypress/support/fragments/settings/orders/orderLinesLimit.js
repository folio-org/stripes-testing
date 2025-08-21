import uuid from 'uuid';

const defaultPOLLimitConfig = {
  key: 'poLines-limit',
  value: '1',
  id: uuid(),
};
const defaultSearchParams = { query: '(module==ORDERS and configName==poLines-limit)' };
const defaultSettingsSearchParams = {
  query: 'key=="poLines-limit"',
  limit: 1,
};

export default {
  getPOLLimitFromConfigEntries(searchParams) {
    return cy
      .okapiRequest({
        path: 'orders-storage/settings',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.settings);
  },

  getPOLLimit(searchParams = defaultSettingsSearchParams) {
    return cy
      .okapiRequest({
        path: 'orders-storage/settings',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body.settings || []);
  },

  createPOLLimitConfigEntry(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders-storage/settings',
        body: config,
      })
      .then(({ body }) => body);
  },

  createPOLLimit({ value }) {
    const payload = { key: 'poLines-limit', value: String(value) };
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders-storage/settings',
        body: payload,
      })
      .then(({ body }) => body);
  },

  updatePOLLimitConfigEntry(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `orders-storage/settings/${config.id}`,
      body: config,
      isDefaultSearchParamsRequired: false,
    });
  },

  updatePOLLimit(setting) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `orders-storage/settings/${setting.id}`,
      body: setting,
      isDefaultSearchParamsRequired: false,
    });
  },

  setPOLLimit(limit) {
    const value = String(limit);
    this.getPOLLimit(defaultSettingsSearchParams).then((settings) => {
      if (settings.length) {
        const current = settings[0];
        this.updatePOLLimit({ ...current, value });
      } else {
        this.createPOLLimit({ value });
      }
    });
  },

  setPOLLimitConfigEntery(limit) {
    this.getPOLLimit(defaultSearchParams).then((configs) => {
      if (configs.length) {
        this.updatePOLLimit({ ...configs[0], value: limit });
      } else {
        this.createPOLLimit({ ...defaultPOLLimitConfig, value: limit });
      }
    });
  },
};
