import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

const getDefaultLibrary = () => {
  const defaultUiLibraries = {
    campusId: uuid(),
    code: `autotest_code_${getRandomPostfix()}`,
    id: uuid(),
    name: `autotest_name_${getRandomPostfix()}`,
  };
  return defaultUiLibraries;
};

export default {
  getDefaultLibrary,

  createViaApi: (librariesProperties) => {
    return cy
      .okapiRequest({
        path: 'location-units/libraries',
        body: librariesProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },
  defaultUiLibraries : {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
};
