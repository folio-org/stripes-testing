import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  createViaApi: (institutionsProperties) => {
    cy.okapiRequest({
      path: 'location-units/institutions',
      body: institutionsProperties,
      method: 'POST'
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
