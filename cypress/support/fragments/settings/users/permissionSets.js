import {
  Button,
  TextField,
  Section,
  PaneHeader,
  MultiColumnListRow,
  Checkbox,
  Modal,
  KeyValue,
  ListItem,
  TextArea,
  NavListItem,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const selectPermissionsModal = Modal('Select Permissions');
const saveAndCloseBtn = Button('Save & close');
const userSearch = TextField('User search');
const generalInformation = Section({ id: 'generalInformation' });

export default {
  waitLoading() {
    cy.expect(PaneHeader('Permission sets').exists());
  },
  chooseFromList(permissionSetName) {
    cy.do(NavListItem(permissionSetName).click());
  },
  addPermissions(permissions) {
    cy.do(Button({ id: 'clickable-add-permission' }).click());
    cy.expect(selectPermissionsModal.exists());
    cy.wrap(permissions).each((permission) => {
      cy.do(userSearch.fillIn(permission));
      cy.do(Button('Search').click());
      cy.do(MultiColumnListRow({ index: 0 }).find(Checkbox()).click());
    });
    cy.do(selectPermissionsModal.find(saveAndCloseBtn).click());
  },
  createNewPermissionSet(values) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    cy.expect(PaneHeader('New permission set').exists());
    cy.do([
      TextField({ id: 'input-permission-title' }).fillIn(values.name),
      TextArea({ id: 'input-permission-description' }).fillIn(values.description),
    ]);
    this.addPermissions(values.permissions);
    cy.do(Button({ id: 'clickable-save-permission-set' }).click());
  },
  checkPermissionSet(values) {
    cy.expect([
      generalInformation.find(KeyValue('Permission set name', { value: values.name })).exists(),
      generalInformation.find(KeyValue('Description', { value: values.description })).exists(),
    ]);
    cy.do(Button({ id: 'accordion-toggle-button-assignedPermissions' }).click());
    cy.wrap(values.permissions).each((permission) => {
      cy.expect(Section({ id: 'assignedPermissions' }).find(ListItem(permission)).exists());
    });
  },
  checkAfterSaving(values) {
    InteractorsTools.checkCalloutMessage(
      `The permission set ${values.name} was successfully created.`,
    );
    this.checkPermissionSet(values);
  },
  checkNewButtonNotAvailable() {
    cy.expect(Button({ id: 'clickable-create-entry' }).absent());
  },
  checkEditButtonNotAvailable() {
    cy.expect(Button({ id: 'clickable-edit-item', disabled: true }).exists());
  },
  createPermissionSetViaApi(body) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'perms/permissions',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
  deletePermissionSetViaApi(permSetId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `perms/permissions/${permSetId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
