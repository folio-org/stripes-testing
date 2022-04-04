import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  createViaApi: (campusesProperties) => {
    cy.okapiRequest({
      path: 'location-units/campuses',
      body: campusesProperties,
      method: 'POST'
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
