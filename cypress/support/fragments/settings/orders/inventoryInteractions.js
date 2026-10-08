import OrderStorageSettings from '../../orders/orderStorageSettings';
import Configs from '../configs';

const INSTANCE_MATCHING_SETTING_KEY = 'disableInstanceMatching';
const INVENTORY_INTERACTIONS_DEFAULTS_SETTING_KEY = 'createInventory';
const INSTANCE_STATUS_SETTING_KEY = 'inventory-instanceStatusCode';
const INSTANCE_TYPE_SETTING_KEY = 'inventory-instanceTypeCode';
const LOAN_TYPE_SETTING_KEY = 'inventory-loanTypeName';
const ORDERS_CONFIG_MODULE = 'ORDERS';

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
    return Configs.getConfigViaApi({
      query: `(module==${ORDERS_CONFIG_MODULE} and configName==${INSTANCE_STATUS_SETTING_KEY})`,
    });
  },
  setInstanceStatusSetting(setting) {
    return Configs.updateConfigViaApi(setting);
  },

  /* Instance type */
  getInstanceTypeSettings() {
    return Configs.getConfigViaApi({
      query: `(module==${ORDERS_CONFIG_MODULE} and configName==${INSTANCE_TYPE_SETTING_KEY})`,
    });
  },
  setInstanceTypeSetting(setting) {
    return Configs.updateConfigViaApi(setting);
  },

  /* Loan type */
  getLoanTypeSettings() {
    return Configs.getConfigViaApi({
      query: `(module==${ORDERS_CONFIG_MODULE} and configName==${LOAN_TYPE_SETTING_KEY})`,
    });
  },
  setLoanTypeSetting(setting) {
    return Configs.updateConfigViaApi(setting);
  },
};
