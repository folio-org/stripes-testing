import { v4 as uuidv4 } from 'uuid';
import {
  Pane,
  Button,
  Accordion,
  TextField,
  MultiColumnListRow,
  Checkbox,
  Modal,
  MultiColumnList,
  Select,
  MultiSelect,
  TextArea,
  HTML
} from '../../../../interactors';
import TopMenu from '../topMenu';
import defaultUser from './userDefaultObjects/defaultUser';

const userSearch = TextField('User search');
const saveAndCloseBtn = Button('Save & close');
const actionsButton = Button('Actions');
const userDetailsPane = Pane({ id: 'pane-userdetails' });
const editButton = Button('Edit');
const extendedInformationAccordion = Accordion('Extended information');
const externalSystemIdTextfield = TextField('External system ID');
const customFieldsAccordion = Accordion('Custom fields');
const selectPermissionsModal = Modal('Select Permissions');
const permissionsAccordion = Accordion({ id: 'permissions' });
const addPermissionsButton = Button({ id: 'clickable-add-permission' });

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

  changeMiddleName(midName) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      TextField({ id: 'adduser_middlename' }).fillIn(midName),
    ]);
  },

  addPermissions(permissions) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      permissionsAccordion.clickHeader(),
      addPermissionsButton.click()
    ]);

    permissions.forEach(permission => {
      cy.do(userSearch.fillIn(permission));
      cy.expect(userSearch.is({ value: permission }));
      // wait is needed to avoid so fast robot clicks
      cy.wait(1000);
      cy.do(Button('Search').click());
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
    });
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  verifyPermissionDoesNotExist(permission) {
    cy.do([
      addPermissionsButton.click(),
      userSearch.fillIn(permission)]);
    cy.expect(userSearch.is({ value: permission }));
    // wait is needed to avoid so fast robot clicks
    cy.wait(1000);
    cy.do(Button('Search').click());
    cy.expect(selectPermissionsModal.find(HTML('The list contains no items')).exists());
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },

  addServicePoints(...points) {
    cy.do([
      Button({ id: 'accordion-toggle-button-servicePoints' }).click(),
      Button({ id: 'add-service-point-btn' }).click(),
    ]);

    points.forEach(point => {
      cy.do(MultiColumnListRow({ content: point, isContainer: true }).find(Checkbox()).click());
    });

    cy.do(Modal().find(saveAndCloseBtn).click());
  },

  saveAndClose() {
    cy.do(saveAndCloseBtn.click());
  },

  addServicePointViaApi: (servicePointId, userId, defaultServicePointId) => addServicePointsViaApi([servicePointId], userId, defaultServicePointId),

  // we can remove the service point if it is not Preference
  changeServicePointPreference: (userName = defaultUser.defaultUiPatron.body.userName) => {
    cy.visit(TopMenu.usersPath);
    cy.do(TextField({ id: 'input-user-search' }).fillIn(userName));
    cy.do(Button('Search').click());
    cy.do(MultiColumnList().click({ row: 0, column: 'Active' }));
    cy.do(userDetailsPane.find(actionsButton).click());
    cy.do(Button({ id: 'clickable-edituser' }).click());
    cy.do(Button({ id: 'accordion-toggle-button-servicePoints' }).click());
    cy.do(Select({ id: 'servicePointPreference' }).choose('None'));
    cy.do(Button({ id: 'clickable-save' }).click());
  },

  changeServicePointPreferenceViaApi: (userId, servicePointIds, defaultServicePointId = null) => cy.okapiRequest({
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
    }),

  updateExternalIdViaApi(user, externalSystemId) {
    cy.updateUser({
      ...user,
      externalSystemId
    });
  },

  addExternalId(externalId) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      extendedInformationAccordion.click(),
      extendedInformationAccordion.find(externalSystemIdTextfield).fillIn(externalId),
    ]);
    this.saveAndClose();
  },

  addMultiSelectCustomField(data) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      customFieldsAccordion.click(),
      customFieldsAccordion.find(MultiSelect({ label: data.fieldLabel })).choose(data.label1),
      customFieldsAccordion.find(MultiSelect({ label: data.fieldLabel })).choose(data.label2),
    ]);
    this.saveAndClose();
  },

  addCustomField(customFieldName, customFieldText) {
    cy.do([
      userDetailsPane.find(actionsButton).click(),
      editButton.click(),
      customFieldsAccordion.click(),
      customFieldsAccordion.find(TextArea({ label: customFieldName })).fillIn(customFieldText),
    ]);
    this.saveAndClose();
  },
};
