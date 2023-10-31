import uuid from 'uuid';

import Configs from '../configs';

export default {
  generateOpenOrderConfig(isDuplicateCheckDisabled = false) {
    return {
      value: JSON.stringify({ isDuplicateCheckDisabled }),
      module: 'ORDERS',
      configName: 'openOrder',
      id: uuid(),
    };
  },
  getOpenOrderConfigViaApi() {
    return Configs.getConfigViaApi({ query: '(module==ORDERS and configName==openOrder)' });
  },
  setDuplicateCheckValue(isDuplicateCheckDisabled) {
    this.getOpenOrderConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ isDuplicateCheckDisabled }),
        });
      } else {
        const config = this.generateOpenOrderConfig(isDuplicateCheckDisabled);
        Configs.createConfigViaApi(config);
      }
    });
  },
};
