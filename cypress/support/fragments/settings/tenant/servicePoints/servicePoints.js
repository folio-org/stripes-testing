import { getTestEntityValue } from '../../../../utils/stringTools';
import { NavListItem, Pane, Button, TextField } from '../../../../../../interactors';

const servicePointsPane = Pane('Service points');

const defaultServicePoint = {
  // required parameter
  code: undefined,
  discoveryDisplayName: getTestEntityValue('discovery_display_name'),
  // required parameter
  id: undefined,
  // required parameter
  name: undefined,
};

const getDefaultServicePointWithPickUpLocation = (servicePointName, id) => {
  return {
    ...defaultServicePoint,
    code: getTestEntityValue(servicePointName),
    id,
    name: getTestEntityValue(servicePointName),
    pickupLocation: true,
    holdShelfExpiryPeriod:{ intervalId:'Hours', 'duration':1 }
  };
};

export default {
  defaultServicePoint,
  getDefaultServicePointWithPickUpLocation,
  getViaApi: (searchParams) => cy.okapiRequest({
    path: 'service-points',
    searchParams,
  }).then(({ body }) => body.servicepoints),

  createViaApi : (servicePointParameters) => cy.okapiRequest({
    path: 'service-points',
    body: servicePointParameters,
    method: 'POST',
    isDefaultSearchParamsRequired: false
  }),

  deleteViaApi : (servicePointId) => cy.okapiRequest({
    path: `service-points/${servicePointId}`,
    method: 'DELETE',
    isDefaultSearchParamsRequired: false
  }),

  goToServicePointsTab() {
    cy.do(NavListItem('Tenant').click());
    cy.expect(Pane('Tenant').exists());
    cy.do(NavListItem('Service points').click());
    cy.expect(servicePointsPane.exists());
  },

  createNewServicePoint({ name, code, displayName }) {
    cy.do(Button('+ New').click());
    // UI renders 2 times. There is no way to create good waiter
    cy.wait(2000);
    cy.do([
      TextField({ name: 'name' }).fillIn(name),
      TextField({ name: 'code' }).fillIn(code),
      TextField({ name: 'discoveryDisplayName' }).fillIn(displayName),
      Button('Save & close').click(),
    ]);
  },

  servicePointExists(name) {
    cy.expect(servicePointsPane.find(NavListItem(name)).exists());
  },

  editServicePoint({ name, newName, newCode, newDisplayName }) {
    cy.do([
      Button(name).click(),
      Pane(name).find(Button('Edit')).click(),
      TextField({ name: 'name' }).fillIn(newName || name),
    ]);
    if (newCode) cy.do(TextField({ name: 'code' }).fillIn(newCode));
    if (newDisplayName) cy.do(TextField({ name: 'discoveryDisplayName' }).fillIn(newDisplayName));
    cy.do(Button('Save & close').click());
  },
};
