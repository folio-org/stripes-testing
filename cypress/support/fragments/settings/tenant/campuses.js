import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

const getDefaultCampuse = () => {
  const defaultUiCampuses = {
    code: `autotest_code_${getRandomPostfix()}`,
    id: uuid(),
    institutionId: '',
    name: `autotest_name_${getRandomPostfix()}`,
  };
  return defaultUiCampuses;
};

export default {
  getDefaultCampuse,

  createViaApi: (campusesProperties) => {
    return cy
      .okapiRequest({
        path: 'location-units/campuses',
        body: campusesProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },
  defaultUiCampuses : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      institutionId: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
};
