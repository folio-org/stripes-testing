import OrderStorageSettings from '../../orders/orderStorageSettings';

const SETTING_KEY = 'poLines-limit';

export default {
  getPOLLimit() {
    return OrderStorageSettings.getSettingsViaApi({ key: SETTING_KEY });
  },

  createPOLLimit({ value }) {
    const payload = {
      key: SETTING_KEY,
      value: String(value),
    };

    return OrderStorageSettings.createSettingViaApi(payload);
  },

  updatePOLLimit(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  setPOLLimit(limit) {
    const value = String(limit);
    this.getPOLLimit().then((settings) => {
      if (settings.length) {
        const current = settings[0];
        this.updatePOLLimit({ ...current, value });
      } else {
        this.createPOLLimit({ value });
      }
    });
  },
};
