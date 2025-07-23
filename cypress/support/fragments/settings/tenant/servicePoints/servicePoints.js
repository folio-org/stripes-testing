import uuid from 'uuid';

import getRandomPostfix from '../../../../utils/stringTools';
import { NavListItem, Pane, Button, TextField, KeyValue } from '../../../../../../interactors';

const servicePointsPane = Pane('Service points');
const closeButton = Button({ icon: 'times' });
const closeNewEditFormButton = Button({ id: 'clickable-close-service-point' });
const collapseAllButton = Button('Collapse all');
const generalInfo = Button({ id: 'accordion-toggle-button-generalInformation' });
const locationSection = Button({ id: 'accordion-toggle-button-locationSection' });
const newButton = Button('+ New');
const editButton = Button('Edit');
const saveAndCloseButton = Button('Save & close');

const defaultServicePoint = {
  code: `autotest_code_${getRandomPostfix()}`,
  id: uuid(),
  discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
  name: `autotest_service_point_name_${getRandomPostfix()}`,
};

const getDefaultServicePoint = ({
  name = `autotest_service_point_name_${getRandomPostfix()}`,
  id = uuid(),
} = {}) => {
  return {
    id,
    name,
    code: `autotest_code_${getRandomPostfix()}`,
    discoveryDisplayName: `autotest_discovery_display_name_${getRandomPostfix()}`,
  };
};

const getDefaultServicePointWithPickUpLocation = ({ name, id } = {}) => {
  return {
    ...getDefaultServicePoint({ name, id }),
    pickupLocation: true,
    holdShelfExpiryPeriod: { intervalId: 'Hours', duration: 1 },
  };
};

const CIRC_DESK_1 = 'Circ Desk 1';
const CIRC_DESK_2 = 'Circ Desk 2';
const ONLINE = 'Online';

const defaultServicePoints = [CIRC_DESK_1, CIRC_DESK_2, ONLINE];

export default {
  CIRC_DESK_1,
  CIRC_DESK_2,
  ONLINE,
  defaultServicePoint,
  defaultServicePoints,
  getDefaultServicePoint,
  getDefaultServicePointWithPickUpLocation,

  setupUserServicePointsMultiple(username, servicePointNames) {
    cy.getUsers({ limit: 1, query: `"username"="${username}"` }).then((users) => {
      this.getViaApi().then((servicePoints) => {
        const servicePointIds = servicePointNames
          .map((name) => servicePoints.find((sp) => sp.name.includes(name))?.id)
          .filter(Boolean);
        cy.getUserServicePoints(users[0].id).then((userServicePoints) => {
          if (userServicePoints && userServicePoints.length > 0) {
            this.changeServicePointPreferenceViaApi(
              users[0].id,
              servicePointIds,
              servicePointIds[0],
            );
          } else {
            this.addServicePointsViaApi(servicePointIds, users[0].id, servicePointIds[0]);
          }
          cy.wait(1000);
        });
      });
    });
  },

  setupUserDefaultServicePoints(username) {
    this.setupUserServicePointsMultiple(username, defaultServicePoints);
  },

  getViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'service-points',
        searchParams,
      }).then(({ body }) => body.servicepoints);
  },

  getCircDesk1ServicePointViaApi() {
    if (!Cypress.env(CIRC_DESK_1)) {
      return this.getViaApi({ limit: 1, query: `name=="${CIRC_DESK_1}"` }).then((servicePoints) => {
        Cypress.env(CIRC_DESK_1, servicePoints[0]);
        return servicePoints[0];
      });
    } else {
      return Cypress.env(CIRC_DESK_1);
    }
  },
  getCircDesk2ServicePointViaApi() {
    if (!Cypress.env(CIRC_DESK_2)) {
      return this.getViaApi({ limit: 1, query: `name=="${CIRC_DESK_2}"` }).then((servicePoints) => {
        Cypress.env(CIRC_DESK_2, servicePoints[0]);
        return servicePoints[0];
      });
    } else {
      return Cypress.env(CIRC_DESK_2);
    }
  },
  getOnlineServicePointViaApi() {
    if (!Cypress.env(ONLINE)) {
      return this.getViaApi({ limit: 1, query: `name=="${ONLINE}"` }).then((servicePoints) => {
        Cypress.env(ONLINE, servicePoints[0]);
        return servicePoints[0];
      });
    } else {
      return Cypress.env(ONLINE);
    }
  },

  createViaApi: (servicePointParameters = defaultServicePoint) => cy.okapiRequest({
    path: 'service-points',
    body: servicePointParameters,
    method: 'POST',
    isDefaultSearchParamsRequired: false,
  }),

  deleteViaApi: (servicePointId) => cy.okapiRequest({
    path: `service-points/${servicePointId}`,
    method: 'DELETE',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }),

  waitLoading() {
    cy.expect(Pane('Service points').exists());
  },

  verifyNewButtonEnabled() {
    cy.expect(newButton.has({ disabled: false }));
  },

  verifyEditAndCloseButtonEnabled() {
    cy.expect([editButton.has({ disabled: false }), closeButton.has({ disabled: false })]);
  },

  openEditServicePointForm(name) {
    cy.do(editButton.click());
    cy.expect(Pane(`Edit: ${name}`).exists());
  },

  openNewServicePointForm() {
    cy.do(newButton.click());
    cy.expect([
      Pane('New service point').exists(),
      saveAndCloseButton.has({ disabled: true }),
      editButton.has({ disabled: false }),
    ]);
  },

  closeEditServicePointForm() {
    cy.do(closeNewEditFormButton.click());
    this.waitLoading();
  },

  closeNewServicePointForm() {
    cy.do(closeNewEditFormButton.click());
    this.waitLoading();
  },

  goToServicePointsTab() {
    cy.do(NavListItem('Tenant').click());
    cy.expect(Pane('Tenant').exists());
    cy.do(NavListItem('Service points').click());
    cy.expect(servicePointsPane.exists());
  },

  createNewServicePoint({ name, code, displayName }) {
    cy.do(newButton.click());
    // UI renders 2 times. There is no way to create good waiter
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
    cy.do([
      TextField({ name: 'name' }).fillIn(name),
      TextField({ name: 'code' }).fillIn(code),
      TextField({ name: 'discoveryDisplayName' }).fillIn(displayName),
      saveAndCloseButton.click(),
    ]);
  },

  servicePointExists(name) {
    cy.expect(servicePointsPane.find(NavListItem(name)).exists());
  },

  editServicePoint({ name, newName, newCode, newDisplayName }) {
    cy.do([
      Button(name).click(),
      Pane(name).find(editButton).click(),
      TextField({ name: 'name' }).fillIn(newName || name),
    ]);
    if (newCode) cy.do(TextField({ name: 'code' }).fillIn(newCode));
    if (newDisplayName) cy.do(TextField({ name: 'discoveryDisplayName' }).fillIn(newDisplayName));
    cy.do(saveAndCloseButton.click());
  },

  openServicePointDetails(name) {
    cy.do(Button(name).click());
    cy.expect(Pane(name).exists());
  },

  checkPaneContent({ name, code, discoveryDisplayName }) {
    cy.expect([
      closeButton.exists(),
      collapseAllButton.exists(),
      editButton.absent(),
      KeyValue('Name').has({ value: name }),
      KeyValue('Code').has({ value: code }),
      KeyValue('Discovery display name').has({ value: discoveryDisplayName }),
    ]);
  },

  collapseSection() {
    cy.do(collapseAllButton.click());
    cy.expect(
      Button('Expand all').exists(),
      generalInfo.has({
        ariaExpanded: false,
      }),
      locationSection.has({
        ariaExpanded: false,
      }),
    );
  },

  closeServicePointPane(name) {
    cy.do(closeButton.click());
    cy.expect(Pane(name).absent());
  },
};
