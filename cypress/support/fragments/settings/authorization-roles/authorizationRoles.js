import {
  Button,
  Checkbox,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  TextField,
  including,
  Modal,
  TextArea,
  Accordion,
} from '../../../../../interactors';

const rolesPane = Pane('Authorization roles');
const newButton = Button('+ New');
const createRolePane = Pane('Create role');
const roleNameInput = TextField('Name*');
const roleDescriptionInput = TextArea('Description');
const selectApplicationButton = Button({ id: 'find-application-trigger' });
const selectApplicationModal = Modal('Select application');
const selectAppSearchInput = selectApplicationModal.find(
  TextField({ id: 'input-applications-search' }),
);
const selectAppSearchButton = selectApplicationModal.find(
  Button({ id: 'clickable-search-applications' }),
);
const saveButtonInModal = selectApplicationModal.find(
  Button({ dataTestID: 'submit-applications-modal' }),
);
const capabilitiesAccordion = Accordion('Capabilities');
const capabilitySetsAccordion = Accordion('Capability sets');
const saveButton = Button('Save and close');

export default {
  waitLoading: () => {
    cy.expect(rolesPane.exists());
  },

  waitContentLoading: () => {
    cy.expect(rolesPane.find(MultiColumnListHeader('Name')).exists());
  },

  clickNewButton: () => {
    cy.do(newButton.click());
    cy.expect([
      createRolePane.exists(),
      capabilitiesAccordion.has({ open: true }),
      capabilitySetsAccordion.exists(),
      saveButton.has({ disabled: true }),
    ]);
  },

  fillRoleNameDescription: (roleName, roleDescription = '') => {
    cy.do([roleNameInput.fillIn(roleName), roleDescriptionInput.fillIn(roleDescription)]);
  },

  clickSelectApplication: () => {
    cy.do(selectApplicationButton.click());
    cy.expect(selectApplicationModal.exists());
  },

  selectApplicationInModal: (appName, isSelected = true) => {
    const targetCheckbox = selectApplicationModal
      .find(MultiColumnListRow(including(appName), { isContainer: false }))
      .find(Checkbox());
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  clickSaveInModal: () => {
    cy.do(saveButtonInModal.click());
    cy.expect(selectApplicationModal.absent());
  },

  searchForAppInModal: (appName) => {
    cy.do([selectAppSearchInput.fillIn(appName), selectAppSearchButton.click()]);
  },

  checkSaveButton: (enabled = true) => {
    cy.expect(saveButton.has({ disabled: !enabled }));
  },

  clickSaveButton: () => {
    cy.do(saveButton.click());
  },
};
