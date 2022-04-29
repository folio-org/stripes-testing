import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import DefaultInstanceHoldingItem from '../inventory/holdingsMove/defaultInstanceHoldingItem';
import Campuses from '../settings/tenant/campuses';
import Institutions from '../settings/tenant/institutions';

export default {
// TODO move to settings fragment
  defaultUiServicePoint: {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_service_${getRandomPostfix()}`,
    }
  },

  getDefaulServicePoint:() => {
    return {
      body: {
        code: `autotest_code_${getRandomPostfix()}`,
        discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
        id: uuid(),
        name: `autotest_service_${getRandomPostfix()}`,
      }
    };
  },

  defaultUiLibraries: {
    body: {
      campusId: uuid(),
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
    }
  },
  // Before using the "delete" method, check that it works!
  deleteServicePointViaApi() {
    cy.okapiRequest({
      method: 'DELETE',
      path: `locations/${DefaultInstanceHoldingItem.defaultUiHolding.body.permanentLocationId}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/libraries/${this.defaultUiLibraries.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/campuses/${Campuses.defaultUiCampuses.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `location-units/institutions/${Institutions.defaultUiInstitutions.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `service-points/${this.defaultUiServicePoint.body.id}`,
    });
  },
};
