import { v4 as uuid } from 'uuid';

const KEY = 'poLines-limit';

const settingsSearchParams = {
  query: `key=="${KEY}"`,
  limit: 1,
};

const configEntriesSearchParams = {
  query: '(module==ORDERS and configName==poLines-limit)',
  limit: 1,
};

export default {
  getPOLLimit() {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams: configEntriesSearchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        if (body?.configs?.length) {
          return body.configs;
        }

        return cy
          .okapiRequest({
            path: 'orders-storage/settings',
            searchParams: settingsSearchParams,
            isDefaultSearchParamsRequired: false,
          })
          .then(({ body: sBody }) => sBody?.settings || []);
      });
  },

  setPOLLimitViaApi(limit) {
    const value = String(limit);
    this.getPOLLimit().then((settings) => {
      if (settings.length) {
        const current = settings[0];
        this.updatePOLLimit({ ...current, value });
      } else {
        this.createPOLimit({ value });
      }
    });
  },

  createPOLimit({ value }) {
    const nextVal = String(value);

    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams: configEntriesSearchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        if (body?.configs?.length) {
          return body.configs;
        }

        return cy
          .okapiRequest({
            path: 'orders-storage/settings',
            searchParams: settingsSearchParams,
            isDefaultSearchParamsRequired: false,
          })
          .then(({ body: sBody }) => {
            if (sBody?.settings?.length) {
              return sBody.settings;
            }

            const payload = {
              id: uuid(),
              module: 'ORDERS',
              configName: KEY,
              enabled: true,
              value: nextVal,
            };

            return cy.okapiRequest({
              method: 'POST',
              path: 'configurations/entries',
              isDefaultSearchParamsRequired: false,
              failOnStatusCode: false,
              body: payload,
            });
          });
      });
  },

  updatePOLLimit(setting) {
    if (setting?.key) {
      return cy.okapiRequest({
        method: 'PUT',
        path: `orders-storage/settings/${setting.id}`,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
        body: {
          ...setting,
          value: String(setting.value),
        },
      });
    }

    return cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${setting.id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
      body: {
        id: setting.id,
        module: setting.module ?? 'ORDERS',
        configName: setting.configName ?? KEY,
        enabled: true,
        value: String(setting.value),
      },
    });
  },

  setPOLLimit(limit) {
    const nextVal = String(limit);
    return this.getPOLLimit().then((items) => {
      if (items.length > 0) {
        const current = { ...items[0], value: nextVal };
        return this.updatePOLLimit(current);
      }
      return this.createPOLimit({ value: nextVal });
    });
  },
};
