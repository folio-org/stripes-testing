import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

const getDefaultInstitutions = () => {
  const defaultUiInstitutions = {
    code: `autotest_code_${getRandomPostfix()}`,
    id: uuid(),
    name: `autotest_name_${getRandomPostfix()}`,
  };
  return defaultUiInstitutions;
};

export default {
  getDefaultInstitutions,

  createViaApi: (institutionsProperties) => {
    return cy
      .okapiRequest({
        path: 'location-units/institutions',
        body: institutionsProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },
  defaultUiInstitutions : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
};
