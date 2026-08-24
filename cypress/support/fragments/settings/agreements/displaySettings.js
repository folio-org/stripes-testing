const AGREEMENTS_SETTING_SECTIONS = {
  DISPLAY_SETTINGS: 'agreements_display_settings',
};

const AGREEMENTS_SETTINGS_KEYS = {
  HIDE_RESOURCES: 'hideeresourcesfunctionality',
};

export default {
  getAgreementsAppSettingsViaApi({ searchParams }) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'erm/settings/appSettings',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  putAgreementsAppSettingsViaApi(setting) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `erm/settings/appSettings/${setting.id}`,
        body: setting,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  getAgreementsAppSettingsByKeyViaApi(key) {
    return this.getAgreementsAppSettingsViaApi({
      filters: `key==${key}`,
    });
  },

  getAgreementsDisplaySettingsViaApi() {
    return this.getAgreementsAppSettingsViaApi({
      filters: `section==${AGREEMENTS_SETTING_SECTIONS.DISPLAY_SETTINGS}`,
    });
  },

  getAgreementsHideResourceSettingsViaApi() {
    return this.getAgreementsAppSettingsByKeyViaApi(AGREEMENTS_SETTINGS_KEYS.HIDE_RESOURCES).then(
      (settings) => settings[0],
    );
  },

  setAgreementsHideResourceSettingsViaApi(value) {
    this.getAgreementsHideResourceSettingsViaApi().then((setting) => this.putAgreementsAppSettingsViaApi({ ...setting, value }));
  },
};
