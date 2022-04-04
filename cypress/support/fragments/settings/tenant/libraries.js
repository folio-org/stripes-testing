import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  createViaApi: (librariesProperties) => {
    cy
      .okapiRequest({
        path: 'location-units/libraries',
        body: librariesProperties,
        method: 'POST'
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
