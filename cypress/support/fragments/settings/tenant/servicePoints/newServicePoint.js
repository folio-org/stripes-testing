import uuid from 'uuid';
import getRandomPostfix from '../../../../utils/stringTools';

const servicePointName = `autotest_service_${getRandomPostfix()}`;

const getDefaultServicePoint = (specialName = servicePointName) => {
  const defaultUiServicePoint = {
    code: `autotest_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
    id: uuid(),
    name: specialName,
    pickupLocation: true,
    holdShelfExpiryPeriod: { intervalId: 'Hours', duration: 1 },
  };
  return defaultUiServicePoint;
};

const defaultUiServicePoint = {
  body: {
    code: `autotest_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
    id: uuid(),
    name: servicePointName,
  },
};

export default {
  defaultUiServicePoint,
  getDefaultServicePoint,
};
