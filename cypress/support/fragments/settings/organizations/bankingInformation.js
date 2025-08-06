import uuid from 'uuid';

import Configs from '../configs';

export default {
  generateBankingInformationConfig(isBankingInformationEnabled = false) {
    return {
      value: JSON.stringify({ isBankingInformationEnabled }),
      module: 'ORG', // required
      configName: 'BANKING_INFORMATION', // required
      code: 'BANKING_INFORMATION_ENABLED',
      id: uuid(),
    };
  },
  getBankingInformationConfigViaApi() {
    return Configs.getConfigViaApi({
      query:
        '(module==ORG and configName==BANKING_INFORMATION and code==BANKING_INFORMATION_ENABLED)',
    });
  },
  setBankingInformationValue(isBankingInformationEnabled) {
    this.getBankingInformationConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: isBankingInformationEnabled,
        });
      } else {
        const config = this.generateBankingInformationConfig(isBankingInformationEnabled);
        Configs.createConfigViaApi(config);
      }
    });
  },
};
