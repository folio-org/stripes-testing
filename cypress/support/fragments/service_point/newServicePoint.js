
import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';


export default {

  defaultUiServicePoint : {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  },
  defaultUiLibraries : {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },

  deleteServicePoint() {
    this.deleteLocations();
    this.deleteLibraries();
    this.deleteCampuses();
    this.deleteInstitutions();
    this.deleteNewServicePoint();
  },

  deleteLocations() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `locations/${uuid()}`,
    });
  },
  deleteLibraries() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/libraries/${uuid()}`,
    });
  },
  deleteCampuses() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/campuses/${uuid()}`,
    });
  },
  deleteInstitutions() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/institutions/${uuid()}`,
    });
  },
  deleteNewServicePoint() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `service-points/${uuid()}`,
    });
  },
};
