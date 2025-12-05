import Credentials from './credentials';
import {
  Button,
  including,
  Modal,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  TextField,
} from '../../../../../interactors';
import SettingsPane from '../settingsPane';

const TAB_NAME = 'Access status types';
const rootPane = Pane(TAB_NAME);
const tableHeaders = [
  'Access status type',
  'Description',
  'Last updated',
  '# of records',
  'Actions',
];
const ICON_ACTIONS = {
  EDIT: 'edit',
  TRASH: 'trash',
};
const deleteModal = Modal('Delete Access status type');
const deleteButton = Button('Delete');
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const newButton = Button('New');

export default {
  ICON_ACTIONS,

  openTab() {
    SettingsPane.selectSettingsTab(TAB_NAME);
    this.waitLoading();
  },

  waitLoading() {
    cy.expect(rootPane.exists());
  },

  checkTableHeaders(actionsShown = true) {
    const expectedHeaders = actionsShown ? tableHeaders : tableHeaders.slice(0, -1);
    expectedHeaders.forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  getAccessStatusTypesViaApi(credentialsId) {
    return cy
      .okapiRequest({
        path: `eholdings/kb-credentials/${credentialsId}/access-types`,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.data;
      });
  },

  createAccessStatusTypeViaApi(credentialsId, name, description = '') {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `eholdings/kb-credentials/${credentialsId}/access-types`,
        body: {
          data: {
            attributes: {
              name,
              description,
            },
            type: 'accessTypes',
          },
        },
        contentTypeHeader: 'application/vnd.api+json',
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body?.id;
      });
  },

  deleteAccessStatusTypeViaApi(credentialsId, accessStatusTypeId) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `eholdings/kb-credentials/${credentialsId}/access-types/${accessStatusTypeId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  getAccessStatusTypesForDefaultKbViaApi() {
    return Credentials.getCredentialsViaApi().then((credentials) => {
      return this.getAccessStatusTypes(credentials[0].id);
    });
  },

  createAccessStatusTypeForDefaultKbViaApi(name, description = '') {
    return Credentials.getCredentialsViaApi().then((credentials) => {
      return this.createAccessStatusTypeViaApi(credentials[0].id, name, description);
    });
  },

  deleteAccessStatusTypeFromDefaultKbViaApi(accessStatusTypeId) {
    Credentials.getCredentialsViaApi().then((credentials) => {
      this.deleteAccessStatusTypeViaApi(credentials[0].id, accessStatusTypeId);
    });
  },

  verifyAccessStatusTypeShown({
    name,
    description = 'No value set-',
    numberOfRecords,
    actions = [],
  }) {
    let numberOfRecordsText;
    if (numberOfRecords === 0) numberOfRecordsText = 'No value set-';
    else if (numberOfRecords) numberOfRecordsText = numberOfRecords;
    const row = MultiColumnListRow({
      content: including(`${name}${description}`),
      isContainer: false,
    });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect(row.exists());
    if (numberOfRecordsText) {
      cy.expect(
        row.find(MultiColumnListCell({ columnIndex: 3, content: numberOfRecordsText })).exists(),
      );
    }
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).absent());
    } else {
      Object.values(ICON_ACTIONS).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyAccessStatusTypeAbsent({ name, description = 'No value set-' }) {
    const row = MultiColumnListRow({
      content: including(`${name}${description}`),
      isContainer: false,
    });
    cy.expect(row.absent());
  },

  clickActionButtonForAccessStatusType(iconAction, name, description = 'No value set-') {
    const row = MultiColumnListRow({
      content: including(`${name}${description}`),
      isContainer: false,
    });
    cy.do(
      row
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: iconAction }))
        .click(),
    );
  },

  confirmDeleteAccessStatusType(confirm = true) {
    if (confirm) cy.do(deleteModal.find(deleteButton).click());
    else cy.do(deleteModal.find(cancelButton).click());
    cy.expect(deleteModal.absent());
  },

  fillInTextFields(name, description) {
    cy.do(TextField({ label: tableHeaders[0] }).fillIn(name));
    cy.expect(TextField({ label: tableHeaders[0] }).has({ value: name }));
    cy.do(TextField({ label: tableHeaders[1] }).fillIn(description));
    cy.expect(TextField({ label: tableHeaders[1] }).has({ value: description }));
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  verifyNewButtonDisabled(isDisabled = true) {
    cy.expect(rootPane.find(newButton).has({ disabled: isDisabled }));
  },

  clickNew() {
    cy.do(rootPane.find(newButton).click());
  },
};
