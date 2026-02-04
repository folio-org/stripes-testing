import uuid from 'uuid';

import Configs from '../configs';

export default {
  generateApprovalConfig(isApprovePayEnabled = false) {
    return {
      value: JSON.stringify({ isApprovePayEnabled }),
      module: 'INVOICE',
      configName: 'approvals',
      id: uuid(),
    };
  },
  getApprovalConfigViaApi() {
    return Configs.getConfigViaApi({ query: '(module==INVOICE and configName==approvals)' });
  },
  setApprovePayValueViaApi(isApprovePayEnabled) {
    this.getApprovalConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ isApprovePayEnabled }),
        });
      } else {
        const config = this.generateApprovalConfig(isApprovePayEnabled);
        Configs.createConfigViaApi(config);
      }
    });
  },
};
