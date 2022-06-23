import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

const servicePointName = `autotest_service_${getRandomPostfix()}`;

const defaultUiServicePoint = {
  body: {
    code: `autotest_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
    id: uuid(),
    name: servicePointName,
  }
};

const getDefaulServicePoint = () => {
  return defaultUiServicePoint;
};

export default {
  defaultUiServicePoint,
  getDefaulServicePoint,
};
