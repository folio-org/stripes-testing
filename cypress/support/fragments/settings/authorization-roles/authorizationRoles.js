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
  MultiColumnList,
  MultiColumnListCell,
  HTML,
  Spinner,
  KeyValue,
} from '../../../../../interactors';

const rolesPane = Pane('Authorization roles');
const newButton = Button('+ New');
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const createRolePane = Pane('Create role');
const editRolePane = Pane('Edit role');
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
const cancelButtonInModal = selectApplicationModal.find(Button('Cancel'));
const capabilitiesAccordion = Accordion('Capabilities');
const capabilitySetsAccordion = Accordion('Capability sets');
const saveButton = Button('Save and close');
const roleNameInView = KeyValue('Name');
const roleDescriptionInView = KeyValue('Description');

const capabilityTables = {
  Data: MultiColumnList({ dataTestId: 'capabilities-data-type' }),
  Settings: MultiColumnList({ dataTestId: 'capabilities-settings-type' }),
  Procedural: MultiColumnList({ dataTestId: 'capabilities-procedural-type' }),
};

const getResultsListByColumn = (columnIndex) => {
  const cells = [];

  cy.wait(2000);
  return cy
    .get('div[data-testid^="capabilities-"] [data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get(`[class*="mclCell-"]:nth-child(${columnIndex + 1})`, { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
};

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
    cy.expect([
      roleNameInput.has({ value: roleName }),
      roleDescriptionInput.has({ value: roleDescription }),
    ]);
  },

  clickSelectApplication: () => {
    cy.do(selectApplicationButton.click());
    cy.expect([
      selectApplicationModal.exists(),
      saveButtonInModal.exists(),
      cancelButtonInModal.exists(),
      selectAppSearchButton.has({ disabled: true }),
      selectAppSearchInput.exists(),
    ]);
  },

  verifySelectApplicationModal: () => {
    cy.expect([
      saveButtonInModal.exists(),
      cancelButtonInModal.exists(),
      selectAppSearchButton.has({ disabled: true }),
      selectAppSearchInput.exists(),
      selectApplicationModal
        .find(MultiColumnListRow({ index: 0, isContainer: false }))
        .find(Checkbox())
        .exists(),
    ]);
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

  verifyAppNamesInCapabilityTables: (appNamesArray) => {
    getResultsListByColumn(0).then((cellTexts) => {
      cellTexts.forEach((cellText) => {
        expect(cellText).to.be.oneOf([...appNamesArray]);
      });
    });
  },

  selectCapabilitySetCheckbox: ({ table, application, resource, action }, isSelected = true) => {
    const targetCheckbox = capabilitySetsAccordion
      .find(capabilityTables[table])
      .find(MultiColumnListRow(`${application}${resource}`, { isContainer: false }))
      .find(MultiColumnListCell({ column: action }))
      .find(Checkbox({ isWrapper: false }));
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isSelected }));
    // wait for capabilities selection to be updated
    cy.wait(1000);
  },

  selectCapabilityCheckbox: ({ table, application, resource, action }, isSelected = true) => {
    const targetCheckbox = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(MultiColumnListRow(`${application}${resource}`, { isContainer: false }))
      .find(MultiColumnListCell({ column: action }))
      .find(Checkbox({ isWrapper: false }));
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  verifyCapabilityCheckboxCheckedAndDisabled: ({ table, resource, action }) => {
    const targetCheckbox = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: true, labelText: 'Read-only' }));
  },

  verifyCapabilityCheckboxUncheckedAndEnabled: ({ table, resource, action }) => {
    const targetCheckbox = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: false, disabled: false }));
  },

  clickOnRoleName: (roleName) => {
    cy.do(rolesPane.find(HTML(roleName, { className: including('root') })).click());
    cy.expect([
      Pane(roleName).exists(),
      capabilitiesAccordion.has({ open: false }),
      capabilitySetsAccordion.has({ open: false }),
    ]);
  },

  clickOnCapabilitiesAccordion: (checkOpen = true) => {
    cy.do(capabilitiesAccordion.clickHeader());
    if (checkOpen) cy.expect(capabilitiesAccordion.has({ open: true }));
  },

  clickOnCapabilitySetsAccordion: (checkOpen = true) => {
    cy.do(capabilitySetsAccordion.clickHeader());
    if (checkOpen) cy.expect(capabilitySetsAccordion.has({ open: true }));
  },

  checkCountOfCapablities: (table, expectedCount) => {
    cy.expect(capabilitiesAccordion.find(capabilityTables[table]).has({ rowCount: expectedCount }));
  },

  checkCountOfCapablitySets: (table, expectedCount) => {
    cy.expect(
      capabilitySetsAccordion.find(capabilityTables[table]).has({ rowCount: expectedCount }),
    );
  },

  checkAfterSaveCreate: (roleName, roleDescription = '') => {
    cy.expect(createRolePane.absent());
    cy.do(
      rolesPane.find(MultiColumnListCell(roleName)).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect(
          rolesPane.find(MultiColumnListCell(roleDescription, { row: rowNumber })).exists(),
        );
      }),
    );
  },

  verifyEmptyCapabilitiesAccordion: () => {
    cy.expect([Spinner().absent(), capabilitiesAccordion.find(MultiColumnListRow()).absent()]);
  },

  verifyEmptyCapabilitySetsAccordion: () => {
    cy.expect([Spinner().absent(), capabilitySetsAccordion.find(MultiColumnListRow()).absent()]);
  },

  verifyCapabilitySetCheckboxEnabled: ({ table, resource, action }, isEnabled = true) => {
    const targetCheckbox = capabilitySetsAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    if (isEnabled) cy.expect(targetCheckbox.has({ disabled: !isEnabled }));
    else cy.expect(targetCheckbox.has({ checked: true, labelText: 'Read-only' }));
  },

  verifyCapabilitySetCheckboxChecked: ({ table, resource, action }, isSelected = true) => {
    const targetCheckbox = capabilitySetsAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  clickOnCheckedDisabledCheckbox: ({ table, resource, action }) => {
    const targetCheckbox = capabilitiesAccordion.find(capabilityTables[table]).find(
      Checkbox({
        ariaLabel: `${action} ${resource}`,
        isWrapper: false,
        checked: true,
        labelText: 'Read-only',
      }),
    );
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: true, labelText: 'Read-only' }));
  },

  openForEdit: () => {
    cy.do([actionsButton.click(), editButton.click()]);
    cy.expect([
      editRolePane.exists(),
      Spinner().absent(),
      capabilitiesAccordion.has({ open: true }),
      capabilitySetsAccordion.exists(),
      saveButton.exists(),
    ]);
  },

  checkAfterSaveEdit: (roleName, roleDescription = '') => {
    cy.expect([
      editRolePane.absent(),
      Pane(roleName).exists(),
      roleNameInView.has({ value: roleName }),
    ]);
    if (roleDescription) cy.expect(roleDescriptionInView.has({ value: roleDescription }));
  },

  verifyCapabilityCheckboxAbsent: ({ table, resource, action }) => {
    cy.expect(
      capabilitiesAccordion
        .find(capabilityTables[table])
        .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }))
        .absent(),
    );
  },

  verifyCapabilityCheckboxChecked: ({ table, resource, action }, isSelected = true) => {
    const targetCheckbox = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  verifyCapabilityTableAbsent(tableName) {
    cy.expect(capabilitiesAccordion.find(capabilityTables[tableName]).absent());
  },

  verifyCapabilitySetTableAbsent(tableName) {
    cy.expect(capabilitySetsAccordion.find(capabilityTables[tableName]).absent());
  },
};