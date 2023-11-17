import uuid from 'uuid';

import Configs from '../configs';

export default {
  generateOpenOrderConfig({ isDuplicateCheckDisabled = false, isOpenOrderEnabled = false } = {}) {
    return {
      value: JSON.stringify({ isDuplicateCheckDisabled, isOpenOrderEnabled }),
      module: 'ORDERS',
      configName: 'openOrder',
      id: uuid(),
    };
  },
  getOpenOrderConfigViaApi() {
    return Configs.getConfigViaApi({ query: '(module==ORDERS and configName==openOrder)' });
  },
  setOpenOrderValue(isOpenOrderEnabled) {
    this.getOpenOrderConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ isOpenOrderEnabled }),
        });
      } else {
        const config = this.generateOpenOrderConfig({ isOpenOrderEnabled });
        Configs.createConfigViaApi(config);
      }
    });
  },
  setDuplicateCheckValue(isDuplicateCheckDisabled) {
    this.getOpenOrderConfigViaApi().then((configs) => {
      if (configs[0]) {
        Configs.updateConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ isDuplicateCheckDisabled }),
        });
      } else {
        const config = this.generateOpenOrderConfig({ isDuplicateCheckDisabled });
        Configs.createConfigViaApi(config);
      }
    });
  },
};
