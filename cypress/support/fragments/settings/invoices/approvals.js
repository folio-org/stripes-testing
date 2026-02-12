import uuid from 'uuid';

import InvoiceStorageSettings from '../../invoices/invoiceStorageSettings';

const INVOICE_APPROVALS_SETTING_KEY = 'approvals';

export default {
  generateApprovalConfig(isApprovePayEnabled = false) {
    return {
      id: uuid(),
      key: INVOICE_APPROVALS_SETTING_KEY,
      value: JSON.stringify({ isApprovePayEnabled }),
    };
  },
  getApprovalConfigViaApi() {
    return InvoiceStorageSettings.getSettingsViaApi({ key: INVOICE_APPROVALS_SETTING_KEY });
  },
  setApprovePayValueViaApi(isApprovePayEnabled) {
    this.getApprovalConfigViaApi().then((settings) => {
      if (settings?.length !== 0) {
        InvoiceStorageSettings.updateSettingViaApi({
          ...settings[0],
          value: JSON.stringify({ isApprovePayEnabled }),
        });
      } else {
        const setting = this.generateApprovalConfig(isApprovePayEnabled);
        InvoiceStorageSettings.createSettingViaApi(setting);
      }
    });
  },
};
