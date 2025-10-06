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
  and,
  or,
  PaneHeader,
  matching,
} from '../../../../../interactors';
import DateTools from '../../../utils/dateTools';
import InteractorsTools from '../../../utils/interactorsTools';

const rolesPane = Pane('Authorization roles');
const newButton = Button('+ New');
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const cancelButton = Button('Cancel');
const resetAllButton = Button('Reset all');
const createRolePane = Pane('Create role');
const editRolePane = Pane('Edit role');
const roleNameInput = TextField('Name*');
const roleDescriptionInput = TextArea('Description');
const selectApplicationButton = Button({ id: 'find-application-trigger' });
const selectApplicationModal = Modal('Select application');
const selecAllAppsCheckbox = selectApplicationModal.find(
  Checkbox({ testId: 'select-all-applications' }),
);
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
const saveButton = Button('Save & close');
const roleNameInView = KeyValue('Name');
const roleDescriptionInView = KeyValue('Description');
const duplicateButton = Button('Duplicate');

const capabilityTables = {
  Data: MultiColumnList({ dataTestId: 'capabilities-data-type' }),
  Settings: MultiColumnList({ dataTestId: 'capabilities-settings-type' }),
  Procedural: MultiColumnList({ dataTestId: 'capabilities-procedural-type' }),
};

const roleSearchInputField = rolesPane.find(TextField({ testid: 'search-field' }));
const roleSearchButton = rolesPane.find(Button({ dataTestID: 'search-button' }));
const usersAccordion = Accordion('Assigned users');
const deleteRoleModal = Modal('Delete role');
const assignUsersButton = Button('Assign/Unassign');
const assignUsersModal = Modal('Select User');
const searchInputInAssignModal = TextField('user search');
const searchButtonInAssignModal = assignUsersModal.find(Button('Search'));
const saveButtonInAssignModal = assignUsersModal.find(Button('Save'));
const resultsPaneInAssignModal = Pane('User Search Results');
const assignModalResultColumns = [
  '',
  'Name',
  'Status',
  'Barcode',
  'Patron group',
  'Username',
  'Email',
];
const generalInformationAccordion = Accordion('General Information');
const recordLastUpdatedHeader = generalInformationAccordion.find(
  Button(including('Record last updated:')),
);
const unassignAllCapabilitiesButton = Button('Unassign all capabilities/sets');
const duplicateModal = Modal('Duplicate role?');
const duplicateCalloutSuccessText = (roleName) => `The role ${roleName} has been successfully duplicated`;
const promoteUsersModal = Modal('Create user records in Keycloak');
const confirmButton = Button('Confirm');
const promoteUsersModalText =
  'This operation will create new records in Keycloak for the following users:';
const noUsernameCalloutText = 'User without username cannot be created in Keycloak';

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

export const SETTINGS_SUBSECTION_AUTH_ROLES = 'Authorization roles';

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
    cy.wait(1000);
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
      .find(MultiColumnListRow(matching(new RegExp(`${appName}-\\d\\..+`)), { isContainer: false }))
      .find(Checkbox());
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isSelected }));
  },

  selectAllApplicationsInModal: (isSelected = true) => {
    cy.do(selecAllAppsCheckbox.click());
    cy.expect(selecAllAppsCheckbox.has({ checked: isSelected }));
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

  selectCapabilitySetCheckbox: ({ table, resource, action }, isSelected = true) => {
    let targetRowIndex;
    cy.do(
      capabilitySetsAccordion
        .find(capabilityTables[table])
        .find(MultiColumnListCell(resource, { column: 'Resource' }))
        .perform((el) => {
          targetRowIndex = +el.parentElement.getAttribute('data-row-inner');
        }),
    );
    cy.then(() => {
      const targetCheckbox = capabilitySetsAccordion
        .find(capabilityTables[table])
        .find(MultiColumnListRow({ index: targetRowIndex, isContainer: false }))
        .find(MultiColumnListCell({ column: including(action) }))
        .find(Checkbox({ isWrapper: false }));
      cy.do(targetCheckbox.click());
      cy.expect(targetCheckbox.has({ checked: isSelected }));
      // wait for capabilities selection to be updated
      cy.wait(1000);
    });
  },

  selectCapabilityCheckbox: ({ table, resource, action }, isSelected = true) => {
    let targetRowIndex;
    cy.do(
      capabilitiesAccordion
        .find(capabilityTables[table])
        .find(MultiColumnListCell(resource, { column: 'Resource' }))
        .perform((el) => {
          targetRowIndex = +el.parentElement.getAttribute('data-row-inner');
        }),
    );
    cy.then(() => {
      const targetCheckbox = capabilitiesAccordion
        .find(capabilityTables[table])
        .find(MultiColumnListRow({ index: targetRowIndex, isContainer: false }))
        .find(MultiColumnListCell({ column: including(action) }))
        .find(Checkbox({ isWrapper: false }));
      cy.do(targetCheckbox.click());
      cy.expect(targetCheckbox.has({ checked: isSelected }));
    });
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

  clickOnRoleName: (roleName, capabilitiesShown = true) => {
    cy.do(rolesPane.find(HTML(roleName, { className: including('root') })).click());
    cy.wait(2000);
    cy.expect(Pane(roleName).exists());
    if (capabilitiesShown) {
      cy.expect([
        Pane(roleName).find(Spinner()).absent(),
        capabilitiesAccordion.has({ open: false }),
        capabilitySetsAccordion.has({ open: false }),
      ]);
    }
  },

  clickOnCapabilitiesAccordion: (checkOpen = true) => {
    cy.do(capabilitiesAccordion.clickHeader());
    if (checkOpen) cy.expect(capabilitiesAccordion.has({ open: true }));
  },

  clickOnCapabilitySetsAccordion: (checkOpen = true) => {
    cy.do(capabilitySetsAccordion.clickHeader());
    if (checkOpen) cy.expect(capabilitySetsAccordion.has({ open: true }));
  },

  checkCountOfCapabilityRows: (table, expectedCount) => {
    cy.expect(capabilitiesAccordion.find(capabilityTables[table]).has({ rowCount: expectedCount }));
  },

  checkCountOfCapabilitySetRows: (table, expectedCount) => {
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
    cy.wait(1000);
    cy.do([actionsButton.click(), editButton.click()]);
    cy.expect([
      editRolePane.exists(),
      editRolePane.find(Spinner()).absent(),
      capabilitiesAccordion.has({ open: true }),
      capabilitySetsAccordion.exists(),
      saveButton.exists(),
      unassignAllCapabilitiesButton.exists(),
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

  verifyCapabilityCheckboxChecked: (
    { table, resource, action },
    isSelected = true,
    isEnabled = null,
  ) => {
    const targetCheckbox = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: isSelected }));
    if (isEnabled === true || isEnabled === false) cy.expect(targetCheckbox.has({ disabled: !isEnabled }));
  },

  verifyCapabilityTableAbsent(tableName) {
    cy.expect(capabilitiesAccordion.find(capabilityTables[tableName]).absent());
  },

  verifyCapabilitySetTableAbsent(tableName) {
    cy.expect(capabilitySetsAccordion.find(capabilityTables[tableName]).absent());
  },

  searchRole: (roleName) => {
    cy.do([roleSearchInputField.fillIn(roleName), roleSearchButton.click()]);
  },

  checkCapabilitiesAccordionCounter: (expectedCount, regExp = false) => {
    if (regExp) cy.expect(capabilitiesAccordion.has({ counter: matching(expectedCount) }));
    else cy.expect(capabilitiesAccordion.has({ counter: expectedCount }));
  },

  checkCapabilitySetsAccordionCounter: (expectedCount, regExp = false) => {
    if (regExp) cy.expect(capabilitySetsAccordion.has({ counter: matching(expectedCount) }));
    else cy.expect(capabilitySetsAccordion.has({ counter: expectedCount }));
  },

  checkUsersAccordion: (expectedCount = false) => {
    cy.expect(usersAccordion.has({ open: true }));
    if (expectedCount) cy.expect(usersAccordion.find(MultiColumnList({ rowCount: expectedCount })).exists());
    else cy.expect(usersAccordion.find(MultiColumnList()).absent());
  },

  clickDeleteRole: (roleName = false) => {
    const actionsButtonToClick = roleName ? Pane(roleName).find(actionsButton) : actionsButton;
    cy.do([actionsButtonToClick.click(), deleteButton.click()]);
    cy.expect([
      deleteRoleModal.find(deleteButton).exists(),
      deleteRoleModal.find(cancelButton).exists(),
    ]);
  },

  cancelDeleteRole: (roleName) => {
    cy.do(deleteRoleModal.find(cancelButton).click());
    cy.expect([deleteRoleModal.absent(), Pane(roleName).exists()]);
  },

  confirmDeleteRole: (roleName) => {
    cy.do(deleteRoleModal.find(deleteButton).click());
    cy.expect([
      deleteRoleModal.absent(),
      Pane(roleName).absent(),
      rolesPane.find(HTML(roleName, { className: including('root') })).absent(),
    ]);
  },

  clickOnUsersAccordion: (checkOpen = true) => {
    cy.do(usersAccordion.clickHeader());
    if (checkOpen) cy.expect(usersAccordion.has({ open: true }));
  },

  clickAssignUsersButton: () => {
    cy.do(assignUsersButton.click());
    cy.expect([
      assignUsersModal.exists(),
      searchButtonInAssignModal.has({ disabled: true }),
      saveButtonInAssignModal.has({ disabled: or(true, false) }),
    ]);
  },

  selectUserInModal: (username, isSelected = true) => {
    const targetCheckbox = resultsPaneInAssignModal.find(
      MultiColumnListRow(including(username), { isContainer: false }).find(Checkbox()),
    );
    cy.do([searchInputInAssignModal.fillIn(username), searchButtonInAssignModal.click()]);
    cy.wait(2000);
    cy.expect(
      resultsPaneInAssignModal
        .find(MultiColumnList({ columns: assignModalResultColumns }))
        .exists(),
    );
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isSelected }));
    cy.wait(2000);
  },

  clickSaveInAssignModal: () => {
    cy.do(saveButtonInAssignModal.click());
    cy.expect(assignUsersModal.absent());
  },

  verifyAssignedUser: (lastName, firstName = null, isAssigned = true, patronGroupName = '') => {
    const name = firstName ? `${lastName}, ${firstName}` : lastName;
    const userRow = usersAccordion.find(
      MultiColumnListRow(and(including(name), including(patronGroupName))),
    );
    if (isAssigned) cy.expect(userRow.exists());
    else cy.expect(userRow.absent());
  },

  verifyAssignedUsersAccordion: () => {
    cy.expect([
      usersAccordion.has({ open: true }),
      usersAccordion.find(assignUsersButton).exists(),
      usersAccordion.find(MultiColumnListHeader('Name')).exists(),
      usersAccordion.find(MultiColumnListHeader('Patron group')).exists(),
    ]);
  },

  verifyAssignedUsersAccordionEmpty: () => {
    cy.expect([
      usersAccordion.has({ open: true }),
      usersAccordion.find(assignUsersButton).exists(),
      usersAccordion.find(MultiColumnListRow()).absent(),
    ]);
  },

  clickResetAllInAssignModal: () => {
    cy.do(assignUsersModal.find(resetAllButton).click());
    cy.expect([
      searchInputInAssignModal.has({ value: '' }),
      resultsPaneInAssignModal.find(MultiColumnListRow()).absent(),
    ]);
  },

  selectFilterOptionInAssignModal: (
    filterName,
    optionName,
    isChecked = true,
    resultsFound = null,
  ) => {
    const targetCheckbox = assignUsersModal.find(Accordion(filterName)).find(Checkbox(optionName));
    cy.do(targetCheckbox.click());
    cy.expect(targetCheckbox.has({ checked: isChecked }));
    if (resultsFound === true) {
      cy.expect([
        resultsPaneInAssignModal.find(MultiColumnListRow()).exists(),
        resultsPaneInAssignModal
          .find(MultiColumnList({ columns: assignModalResultColumns }))
          .exists(),
      ]);
    }
    if (resultsFound === false) cy.expect(resultsPaneInAssignModal.find(MultiColumnListRow()).absent());
  },

  verifyCheckboxesCountInCapabilityRow: ({ table, application, resource }, expectedCount) => {
    const targetRow = capabilitiesAccordion
      .find(capabilityTables[table])
      .find(
        MultiColumnListRow(
          or(
            including(`${application}${resource}Read-only`),
            including(`${application}${resource}No value set`),
          ),
          { isContainer: false },
        ),
      );
    cy.expect(targetRow.has({ checkboxCount: expectedCount }));
  },

  verifyCheckboxesCountInCapabilitySetRow: ({ table, application, resource }, expectedCount) => {
    const targetRow = capabilitySetsAccordion
      .find(capabilityTables[table])
      .find(
        MultiColumnListRow(
          or(
            including(`${application}${resource}Read-only`),
            including(`${application}${resource}No value set`),
          ),
          { isContainer: false },
        ),
      );
    cy.expect(targetRow.has({ checkboxCount: expectedCount }));
  },

  waitCapabilitiesShown: () => {
    cy.expect(capabilitiesAccordion.find(MultiColumnListRow()).exists());
  },

  verifyRoleViewPane: (roleName) => {
    cy.expect([
      Pane(roleName).exists(),
      Pane(roleName).find(Spinner()).absent(),
      capabilitiesAccordion.has({ open: false }),
      capabilitySetsAccordion.has({ open: false }),
    ]);
  },

  closeRoleDetailView: (roleName) => {
    cy.do(
      PaneHeader(roleName)
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(Pane(roleName).absent());
  },

  verifyGeneralInformationWhenCollapsed: (updatedDate) => {
    cy.expect(
      generalInformationAccordion.has({
        content: including(`Record last updated: ${updatedDate}`),
      }),
    );
  },

  verifyGeneralInformationWhenExpanded: (updatedDate, updatedUser, createdDate, createdUser) => {
    cy.do(recordLastUpdatedHeader.click());
    cy.expect([
      generalInformationAccordion.has({
        content: and(
          including(`Record last updated: ${updatedDate}`),
          including(`Source: ${updatedUser}`),
          including(`Record created: ${createdDate}`),
          including(`Source: ${createdUser}`),
        ),
      }),
    ]);
  },

  checkCapabilitySpinnersShown() {
    cy.expect([
      capabilitySetsAccordion.find(Spinner()).exists(),
      capabilitiesAccordion.find(Spinner()).exists(),
    ]);
  },

  checkCapabilitySpinnersAbsent() {
    cy.expect([
      capabilitiesAccordion.find(Spinner()).absent(),
      capabilitySetsAccordion.find(Spinner()).absent(),
      capabilitiesAccordion.find(MultiColumnListRow()).exists(),
      capabilitySetsAccordion.find(MultiColumnListRow()).exists(),
    ]);
  },

  openForEditWithoutChecks: () => {
    cy.wait(1000);
    cy.do([actionsButton.click(), editButton.click()]);
  },

  closeRoleEditView: () => {
    cy.do(editRolePane.find(Button({ icon: 'times' })).click());
    cy.expect(editRolePane.absent());
  },

  clickUnassignAllCapabilitiesButton: () => {
    cy.do(unassignAllCapabilitiesButton.click());
    cy.wait(3000);
  },

  clickActionsButton: () => {
    cy.do(actionsButton.click());
  },

  checkDuplicateOptionShown: (isShown = true) => {
    if (isShown) cy.expect(duplicateButton.exists());
    else cy.expect(duplicateButton.absent());
  },

  clickDuplicateButton: () => {
    cy.do(duplicateButton.click());
    cy.expect([
      duplicateModal.find(duplicateButton).exists(),
      duplicateModal.find(cancelButton).exists(),
    ]);
  },

  confirmDuplicateRole: () => {
    cy.do(duplicateModal.find(duplicateButton).click());
    cy.expect(duplicateModal.absent());
  },

  cancelDuplicateRole: () => {
    cy.do(duplicateModal.find(cancelButton).click());
    cy.expect(duplicateModal.absent());
  },

  duplicateRole(roleName, capabilitiesShown = true) {
    const currentDate = DateTools.getFormattedDateWithSlashes({ date: new Date() });
    const duplicatedTitleRegExp = new RegExp(
      `^${roleName} \\(duplicate\\) - ${currentDate.replace('/', '\\/')}, \\d{1,2}:\\d{2}:\\d{2} (A|P)M$`,
    );
    this.clickActionsButton();
    this.clickDuplicateButton();
    this.confirmDuplicateRole();
    InteractorsTools.checkCalloutMessage(duplicateCalloutSuccessText(roleName));
    InteractorsTools.dismissCallout(duplicateCalloutSuccessText(roleName));
    cy.expect(Pane(matching(duplicatedTitleRegExp)).exists());
    cy.expect(Spinner().absent());
    if (capabilitiesShown) {
      cy.expect([
        Spinner().absent(),
        capabilitiesAccordion.has({ open: false }),
        capabilitySetsAccordion.has({ open: false }),
      ]);
    }
    this.checkUsersAccordion(0);
  },

  checkPromoteUsersModal(userIdsArray) {
    cy.expect([
      promoteUsersModal.find(cancelButton).exists(),
      promoteUsersModal.find(confirmButton).exists(),
      promoteUsersModal.has({ message: including(promoteUsersModalText) }),
    ]);
    userIdsArray.forEach((userId) => {
      cy.expect(promoteUsersModal.has({ message: including(userId) }));
    });
  },

  clickConfirmInPromoteUsersModal: () => {
    cy.do(promoteUsersModal.find(confirmButton).click());
    cy.expect(promoteUsersModal.absent());
  },

  clickCancelInPromoteUsersModal: () => {
    cy.do(promoteUsersModal.find(cancelButton).click());
    cy.expect(promoteUsersModal.absent());
  },

  closePromoteUsersModalWithEscapeKey: () => {
    cy.get('[class^="modal--"]').type('{esc}');
    cy.expect(promoteUsersModal.absent());
  },

  checkNoUsernameErrorCallout: () => {
    InteractorsTools.checkCalloutErrorMessage(noUsernameCalloutText);
    InteractorsTools.dismissCallout(noUsernameCalloutText);
  },

  checkRoleFound: (roleName, isFound = true) => {
    const targetRow = rolesPane.find(HTML(roleName, { className: including('root') }));
    if (isFound) cy.expect(targetRow.exists());
    else cy.expect(targetRow.absent());
  },
};
