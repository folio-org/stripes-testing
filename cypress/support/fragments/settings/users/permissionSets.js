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
  checkAfterSaving(values) {
    InteractorsTools.checkCalloutMessage(`The permission set ${values.name} was successfully created.`);
    cy.expect([
      generalInformation.find(KeyValue('Permission set name', { value: values.name })).exists(),
      generalInformation.find(KeyValue('Description', { value: values.description })).exists(),
    ]);
    cy.do(Button({ id: 'accordion-toggle-button-assignedPermissions' }).click());
    cy.wrap(values.permissions).each((permission) => {
      cy.expect(Section({ id: 'assignedPermissions' }).find(ListItem(permission)).exists());
    });
  },
  deletePermissionSetViaApi(permSetId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `perms/permissions/${permSetId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
