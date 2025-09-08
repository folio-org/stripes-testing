import OrderStorageSettings from '../../orders/orderStorageSettings';

const ORDER_APPROVALS_SETTING_KEY = 'approvals';

export default {
  getOrderApprovalsSettings() {
    return OrderStorageSettings.getSettingsViaApi({ key: ORDER_APPROVALS_SETTING_KEY });
  },

  setOrderApprovalsSetting(setting) {
    return OrderStorageSettings.updateSettingViaApi(setting);
  },
};
