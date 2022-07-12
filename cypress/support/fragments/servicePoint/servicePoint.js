import { REQUEST_METHOD } from '../../constants';
import DefaultInstanceHoldingItem from '../inventory/holdingsMove/defaultInstanceHoldingItem';
import Campuses from '../settings/tenant/campuses';
import Institutions from '../settings/tenant/institutions';
import NewServicePoint from '../settings/tenant/servicePoints/newServicePoint';

export default {
  deleteViaApi: (id) => {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `service-points/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  // investigate is this function used
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
      path: `service-points/${NewServicePoint.defaultUiServicePoint.body.id}`,
    });
  },
};
