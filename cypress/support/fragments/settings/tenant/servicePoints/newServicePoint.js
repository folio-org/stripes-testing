import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

const getDefaulServicePoint = () => {
  return {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  };
};

export default {
  getDefaulServicePoint,

  defaultUiServicePoint: {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  },


};
