import uuid from 'uuid';

import OrderStorageSettings from '../../orders/orderStorageSettings';

const SETTING_KEY = 'openOrder';

const getParsedValue = (value) => {
  let currentValue;

  try {
    currentValue = JSON.parse(value);
  } catch {
    currentValue = {};
  }

  return currentValue;
};

export default {
  generateOpenOrderSetting({ isDuplicateCheckDisabled = false, isOpenOrderEnabled = false } = {}) {
    const value = JSON.stringify({ isDuplicateCheckDisabled, isOpenOrderEnabled });

    return {
      id: uuid(),
      key: SETTING_KEY,
      value,
    };
  },
  getOpenOrderConfigViaApi() {
    return OrderStorageSettings.getSettingsViaApi({ key: SETTING_KEY });
  },
  setOpenOrderValue(isOpenOrderEnabled) {
    this.getOpenOrderConfigViaApi().then((settings) => {
      if (settings[0]) {
        OrderStorageSettings.updateSettingViaApi({
          ...settings[0],
          value: JSON.stringify({
            ...getParsedValue(settings[0].value),
            isOpenOrderEnabled,
          }),
        });
      } else {
        const setting = this.generateOpenOrderSetting({ isOpenOrderEnabled });
        OrderStorageSettings.createSettingViaApi(setting);
      }
    });
  },
  setDuplicateCheckValue(isDuplicateCheckDisabled) {
    this.getOpenOrderConfigViaApi().then((settings) => {
      if (settings[0]) {
        OrderStorageSettings.updateSettingViaApi({
          ...settings[0],
          value: JSON.stringify({
            ...getParsedValue(settings[0].value),
            isDuplicateCheckDisabled,
          }),
        });
      } else {
        const setting = this.generateOpenOrderSetting({ isDuplicateCheckDisabled });
        OrderStorageSettings.createSettingViaApi(setting);
      }
    });
  },
};
