import OrderStorageSettings from '../../orders/orderStorageSettings';

const INSTANCE_MATCHING_SETTING_KEY = 'disableInstanceMatching';
const INVENTORY_INTERACTIONS_DEFAULTS_SETTING_KEY = 'createInventory';
const INSTANCE_STATUS_SETTING_KEY = 'inventory-instanceStatusCode';
const INSTANCE_TYPE_SETTING_KEY = 'inventory-instanceTypeCode';
const LOAN_TYPE_SETTING_KEY = 'inventory-loanTypeName';

export default {
  /* Instance matching */
  getInstanceMatchingSettings() {
    return OrderStorageSettings.getSettingsViaApi({ key: INSTANCE_MATCHING_SETTING_KEY });
  },
  setInstanceMatchingSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  /* Inventory interactions defaults */
  getInventoryInteractionsDefaultsSettings() {
    return OrderStorageSettings.getSettingsViaApi({
      key: INVENTORY_INTERACTIONS_DEFAULTS_SETTING_KEY,
    });
  },
  setInventoryInteractionsDefaultsSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  /* Instance status */
  getInstanceStatusSettings() {
    return OrderStorageSettings.getSettingsViaApi({ key: INSTANCE_STATUS_SETTING_KEY });
  },
  setInstanceStatusSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  /* Instance type */
  getInstanceTypeSettings() {
    return OrderStorageSettings.getSettingsViaApi({ key: INSTANCE_TYPE_SETTING_KEY });
  },
  setInstanceTypeSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },

  /* Loan type */
  getLoanTypeSettings() {
    return OrderStorageSettings.getSettingsViaApi({ key: LOAN_TYPE_SETTING_KEY });
  },
  setLoanTypeSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },
};
