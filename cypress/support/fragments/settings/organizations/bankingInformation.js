import uuid from 'uuid';

import Configs from '../configs';

export default {
  generateBankingInformationConfig(isBankingInformationEnabled = false) {
    return {
      value: isBankingInformationEnabled,
      key: 'BANKING_INFORMATION_ENABLED',
      id: uuid(),
    };
  },
  getBankingInformationConfigViaApi() {
    return Configs.getConfigViaApi({ query: 'key=BANKING_INFORMATION_ENABLED' });
  },
  setBankingInformationValue(isBankingInformationEnabled) {
    this.getBankingInformationConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: isBankingInformationEnabled,
        });
      } else {
        // Do nothing
      }
    });
  },
};
