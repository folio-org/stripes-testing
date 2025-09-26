import { API_PATH } from '../../constants';

export default {
  getSettingsViaApi({ id, key }) {
    // If id is passed, get setting by id, otherwise get by key
    const searchParams = key && !id ? { query: `(key==${key})` } : undefined;

    return cy
      .okapiRequest({
        path: [API_PATH.INVOICE_STORAGE_SETTINGS, id].filter(Boolean).join('/'),
        searchParams,
      })
      .then(({ body }) => (id ? body : body.settings));
  },
  createSettingViaApi(setting) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: API_PATH.INVOICE_STORAGE_SETTINGS,
        body: setting,
      })
      .then(({ body }) => body);
  },
  updateSettingViaApi(setting) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `${API_PATH.INVOICE_STORAGE_SETTINGS}/${setting.id}`,
      body: setting,
    });
  },
  deleteSettingViaApi(setting) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `${API_PATH.INVOICE_STORAGE_SETTINGS}/${setting.id}`,
    });
  },
};
