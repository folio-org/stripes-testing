import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

export default {

  defaultUiServicePoint: {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  },
  defaultUiLibraries: {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },

  deleteServicePointViaApi() {
    cy.okapiRequest({
      method: 'DELETE',
      path: `locations/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/libraries/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/campuses/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/institutions/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `service-points/${uuid()}`,
    });
  },
};
