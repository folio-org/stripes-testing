import { v4 as uuidv4 } from 'uuid';
import {
  Pane,
  Button,
  Accordion,
  TextField,
  MultiColumnListRow,
  Checkbox,
  MultiColumnListCell,
  Modal,
  MultiColumnList,
  Select
} from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from './userDefaultObjects/defaultUser';

// servicePointIds is array of ids
const addServicePointsViaApi = (servicePointIds, userId, defaultServicePointId) => cy.okapiRequest({
  method: 'POST',
  path: 'service-points-users',
  body: {
    id: uuidv4(),
    userId,
    servicePointsIds: servicePointIds,
    defaultServicePointId: defaultServicePointId || servicePointIds[0],
  },
});

export default {
  addServicePointsViaApi,

  addPermissions(permissions) {
    cy.do([
      Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click(),
      Button('Edit').click(),
      Accordion({ id: 'permissions' }).clickHeader(),
      Button({ id: 'clickable-add-permission' }).click()
    ]);

    permissions.forEach(permission => {
      cy.do(TextField('User search').fillIn(permission));
      cy.expect(TextField('User search').is({ value: permission }));
      cy.do(Button('Search').click());
      cy.expect(MultiColumnListCell({ content: permission }).exists());
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
    });

    cy.do(Button('Save & close').click());
  },

  addServicePoints(...points) {
    cy.do([
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);

    points.forEach(point => {
      cy.do(MultiColumnListRow({ content: point, isContainer: true }).find(Checkbox()).click());
    });

    cy.do(Modal().find(Button('Save & close')).click());
  },

  saveAndClose() {
    cy.do(Button('Save & close').click());
  },

  addServicePointViaApi: (servicePointId, userId, defaultServicePointId) => addServicePointsViaApi([servicePointId], userId, defaultServicePointId),

  // we can remove the service point if it is not Preference
  changeServicePointPreference: (userName = defaultUser.defaultUiPatron.body.userName) => {
    cy.visit(TopMenu.usersPath);
    cy.do(TextField({ id: 'input-user-search' }).fillIn(userName));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(Pane({ id: 'pane-userdetails' }).find(Button('Actions')).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose('None'));
    cy.do(Button({ id: 'clickable-save' }).click());
  },

  changeServicePointPreferenceViaApi:(userId, servicePointIds, defaultServicePointId = null) => cy.okapiRequest({
    method: 'GET',
    path: `service-points-users?query="userId"="${userId}"`,
    isDefaultSearchParamsRequired: false,
  })
    .then((servicePointsUsers) => {
      cy.okapiRequest({
        method: 'PUT',
        path: `service-points-users/${servicePointsUsers.body.servicePointsUsers[0].id}`,
        body: {
          userId,
          servicePointsIds: servicePointIds,
          defaultServicePointId,
        },
        isDefaultSearchParamsRequired: false,
      });
    })
};
