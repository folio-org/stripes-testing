import { including, matching } from '@interactors/html';
import {
  Button,
  Checkbox,
  EditableListRow,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Pane,
  TextField,
} from '../../../../../../interactors';
import Affiliations, { tenantNames } from '../../../../dictionary/affiliations';
import DateTools from '../../../../utils/dateTools';
import InteractorsTools from '../../../../utils/interactorsTools';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConfirmCreateModal from '../../modal/confirm-create';
import ConfirmShareModal from '../../modal/confirm-share';
import DeleteCancelReason from '../../modal/delete-cancel-reason';

const subjectSourcesList = MultiColumnList({ id: 'editList-subjectsources' });
const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const nameField = TextField({ name: 'items[0].name' });
const rootPane = Pane({ id: 'consortia-controlled-vocabulary-pane' });
const shareCheckbox = Checkbox('Share');
const selectMembersButton = Button('Select members');
const columnIndex = {
  name: 0,
  code: 1,
  source: 2,
  lastUpdated: 3,
  memberLibraries: 4,
  actions: 5,
};

function clickNewButton() {
  cy.do(newButton.click());
}

function enableShareCheckbox() {
  cy.do(shareCheckbox.click());
}

function clickSaveButton() {
  cy.do(saveButton.click());
}

// using in C594434
function clickCancelButton() {
  cy.do(cancelButton.click());
}

function fillNameField(value, rowIndex = 0) {
  cy.do(TextField({ name: `items[${rowIndex}].name` }).fillIn(value));
}

function getRowIndexesByColumnValue(columnIdx, matcher) {
  const rowIndexes = [];
  cy.reload();

  cy.get('#editList-subjectsources').should('exist').and('be.visible');
  cy.wait(5000);

  return cy
    .get('#editList-subjectsources')
    .find('[data-row-index]')
    .each(($row) => {
      const text = $row
        .find(`[class*="mclCell-"]:nth-child(${columnIdx + 1})`)
        .first()
        .text()
        .trim();

      if (matcher(text)) {
        const rowIndex = $row.attr('data-row-index').replace(/^row-/, '') || '';
        rowIndexes.push(rowIndex);
      }
    })
    .then(() => rowIndexes);
}

function clickRowAction(rowIndex, column, icon) {
  cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
    .find(`[class*="mclCell-"]:nth-child(${column + 1}) button[icon="${icon}"]`)
    .click();
}

function verifyAndClickRowAction(rowIndexes, column, expectedValue, icon) {
  cy.wrap(rowIndexes).each((rowIndex) => {
    cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
      .find(`[class*="mclCell-"]:nth-child(${column + 1})`)
      .invoke('text')
      .then((text) => {
        if (text.trim() === expectedValue) {
          clickRowAction(rowIndex, column + 1, icon);
        }
      });
  });
}

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  clickNewButton,
  clickSaveButton,
  clickCancelButton,
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Subject sources');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
  // using in C594429
  createSharedWithAllMembersSubjectSourceWithValidationNameField(name, nameValidationState) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling(false);
    enableShareCheckbox();
    fillNameField(name);
    clickSaveButton();

    const errorMessages = {
      empty: 'Please fill this in to continue',
      duplicate: 'Name is already in use at one or more member libraries.',
    };

    if (errorMessages[nameValidationState]) {
      this.validateNameFieldWithError(errorMessages[nameValidationState]);
    } else {
      cy.wait(1000);
    }
  },
  // using in C594429
  createSharedWithAllMembersSubjectSourceAndCancel(name) {
    clickNewButton();
    fillNameField(name);
    enableShareCheckbox();
    clickCancelButton();
    cy.wait(1500);
    cy.expect(rootPane.exists());
  },
  // using in C594434
  createLocalSubjectSourceSavedForMemberLibraries(name, isUniqueName = true) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling(true);
    fillNameField(name);
    if (!isUniqueName) {
      clickSaveButton();
      this.validateNameFieldWithError('Name is already in use at one or more member libraries.');
    }
    cy.expect(shareCheckbox.has({ checked: false, disabled: true }));
    clickSaveButton();
  },
  // using in C594434
  clickKeepEditingAndVerifyEditMode(
    name,
    source,
    userName,
    isCheckboxChecked = false,
    isCheckboxDisabled = true,
  ) {
    ConfirmCreateModal.waitLoadingConfirmCreate(name);
    ConfirmCreateModal.clickKeepEditing();
    this.verifyNewSubjectSourceRowIsInEditMode(
      name,
      source,
      userName,
      isCheckboxChecked,
      isCheckboxDisabled,
    );
  },

  // using in C594428
  createSharedWithAllMembersSubjectSource(subjectSourceName) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling();
    fillNameField(subjectSourceName);
    enableShareCheckbox();
    cy.expect(shareCheckbox.has({ checked: true }));
    clickSaveButton();
  },
  // using in C594428, C594429
  confirmShareWithAllMembers(subjectSourceName, state = 'created') {
    ConfirmShareModal.waitLoadingConfirmShareToAll(subjectSourceName);
    ConfirmShareModal.clickConfirm();
    cy.expect(rootPane.exists());

    const message =
      state === 'updated'
        ? `${subjectSourceName} was successfully updated for All libraries.`
        : `${subjectSourceName} was successfully created for All libraries.`;

    InteractorsTools.checkCalloutMessage(message);
  },
  // using in C594434
  confirmSaveForMemberLibraries(subjectSourceName, firstTenant, secondTenant, thirdTenant) {
    ConfirmCreateModal.waitLoadingConfirmCreate(subjectSourceName);
    ConfirmCreateModal.clickConfirm();
    InteractorsTools.checkCalloutMessage(
      `${subjectSourceName} was successfully created for ${firstTenant}, ${secondTenant}, ${thirdTenant} libraries.`,
    );
    cy.expect(rootPane.exists());
  },
  // using in C594429
  getSubjectSourceIdViaApi(name, consortiaId) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `consortia/${consortiaId}/publications`,
        body: {
          url: '/subject-sources?limit=2000&offset=0',
          method: 'GET',
          tenants: [Affiliations.College, Affiliations.Consortia, Affiliations.University],
          payload: {},
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return cy
          .okapiRequest({
            path: `consortia/${consortiaId}/publications/${response.body.id}/results`,
            isDefaultSearchParamsRequired: false,
          })
          .then((resp) => {
            const parsedResponse = JSON.parse(resp.body.publicationResults[0].response);
            const item = parsedResponse.subjectSources.find((obj) => obj.name === name);
            return item.id;
          });
      });
  },
  // using in C594429
  deleteViaApi(publicationId, name, consortiaId) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `consortia/${consortiaId}/sharing/settings/${publicationId}`,
      body: {
        url: '/subject-sources',
        settingId: publicationId,
        payload: {
          id: publicationId,
          name,
          source: 'consortium',
        },
      },
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteSubjectSourceByName(name) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text.includes(name)).then((rowIndex) => {
      cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex[0]}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="trash"]`)
        .click();
    });
  },
  cancelDelitionOfSubjectSource(name) {
    DeleteCancelReason.waitLoadingDeleteModal('subject source', name);
    DeleteCancelReason.clickCancel();
  },
  confirmDeletionOfSubjectSource(name) {
    DeleteCancelReason.waitLoadingDeleteModal('subject source', name);
    DeleteCancelReason.clickDelete();
    cy.expect(rootPane.exists());
    InteractorsTools.checkCalloutMessage(`The subject source ${name} was successfully deleted.`);
  },
  // using in C594434
  deleteSubjectSourceByUserAndTenantNames(name, userName, tenantName) {
    cy.wait(1500);

    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        verifyAndClickRowAction(
          rowIndexes,
          columnIndex.memberLibraries,
          tenantName,
          reasonsActions.trash,
        );
        DeleteCancelReason.waitLoadingDeleteModal('subject source', name);
        DeleteCancelReason.clickDelete();
        cy.expect(rootPane.exists());
        InteractorsTools.checkCalloutMessage(
          `The subject source ${name} was successfully deleted.`,
        );
      },
    );
  },
  // using in C594428
  editSubjectSource(name, newName, source, userName) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text.includes(name)).then((rowIndex) => {
      cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex[0]}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="edit"]`)
        .click();
      this.verifyEditedSubjectSourceRow(name, rowIndex, source, userName);
      fillNameField(newName, rowIndex);
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    this.confirmShareWithAllMembers(newName, 'updated');
  },
  // using in C594434
  editSubjectSourceByTenantName(name, newName, source, userName, tenantName) {
    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        this.verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
          this.verifyEditedSubjectSourceRow(name, source, userName, index);
          fillNameField(newName, index);
        });
      },
    );
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    InteractorsTools.checkCalloutMessage(
      including(`${newName} was successfully updated for ${tenantName} library.`),
    );
  },
  validateNameFieldWithError(message) {
    cy.expect([
      nameField.has({ error: message }),
      saveButton.has({ disabled: false }),
      cancelButton.has({ disabled: false }),
    ]);
    cy.wait(1000);
  },
  // using in C594434
  verifyLocalSubjectSourceNotEdited(name) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text.includes(name)).then(
      (rowIndexes) => {
        expect(rowIndexes).to.have.length(2);
        rowIndexes.forEach((index) => {
          cy.expect([
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(MultiColumnListCell({ columnIndex: columnIndex.name, content: name }))
              .exists(),
          ]);
        });
      },
    );
  },
  // using in C594434
  verifyColumnAndClickEdit(rowIndexes, searchValue) {
    let foundRowIndex;

    return cy
      .wrap(rowIndexes)
      .each((rowIndex) => {
        cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
          .find('[class*="mclCell-"]:nth-child(5)')
          .invoke('text')
          .then((text) => {
            const trimmedText = text.trim();

            if (trimmedText === searchValue) {
              foundRowIndex = rowIndex;

              cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
                .find('[class*="mclCell-"]:nth-child(6) button[icon="edit"]')
                .click();
            }
          });
      })
      .then(() => {
        return foundRowIndex;
      });
  },
  // using in C594428
  verifyEditedSubjectSourceRow(name, source, userName, rowIndex) {
    cy.expect([
      TextField({ name: `items[${rowIndex}].name` }).has({ value: name, disabled: false }),
      subjectSourcesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
        .has({ content: source }),
      subjectSourcesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
        .has({ content: including(`${userName}`) }),
      shareCheckbox.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
    ]);
  },
  // using in C594428, C594434
  verifyNewRecordRowBeforeFilling(isShareCheckboxDisabled = false) {
    const row = EditableListRow({ index: 0 });

    cy.expect([
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
      nameField.has({ placeholder: 'name', disabled: false }),
      row.find(MultiColumnListCell({ columnIndex: columnIndex.source })).has({ content: 'local' }),
      row
        .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: false, disabled: isShareCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },
  // using in C594434
  verifyNewSubjectSourceRowIsInEditMode(
    name,
    source,
    userName,
    isCheckboxChecked,
    isCheckboxDisabled,
  ) {
    const row = EditableListRow({ index: 0 });

    cy.expect([
      TextField({ placeholder: 'name' }).has({ value: name }),
      row.find(MultiColumnListCell({ columnIndex: columnIndex.source })).has({ content: source }),
      row
        .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
        .has({ content: userName }),
      shareCheckbox.has({ checked: isCheckboxChecked, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  // using in C594428, C594429
  verifySharedSubjectSourceExists({ name: subjectSourceName, actions = [] }) {
    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.name }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
            .has({ content: 'consortium' }),
          // EditableListRow({ index: rowIndex })
          //   .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
          //   .has({ content: including('System, System user - mod-consortia-keycloak ') }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.memberLibraries }))
            .has({ content: 'All' }),
        ]);
        Object.values(reasonsActions).forEach((action) => {
          const actionButton = EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.actions }))
            .find(Button({ icon: action }));

          cy.expect(actions.includes(action) ? actionButton.exists() : actionButton.absent());
        });
      }),
    );
  },
  // using in C594428
  verifySubjectSourcesListIsEmpty() {
    cy.expect([
      rootPane.has({ text: including('The list contains no items') }),
      rootPane.find(newButton).absent(),
    ]);
  },
  // using in C594434
  verifyThreeLocalSubjectSourcesExist(subjectSourceName, userName) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const allowedSources = [tenantNames.central, tenantNames.college, tenantNames.university];
    const regex = new RegExp(`^(${allowedSources.join('|')})$`);

    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        expect(rowIndexes).to.have.length(3);
        rowIndexes.forEach((index) => {
          cy.expect([
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(
                MultiColumnListCell({ columnIndex: columnIndex.name, content: subjectSourceName }),
              )
              .exists(),
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(MultiColumnListCell({ columnIndex: columnIndex.source, content: 'local' }))
              .exists(),
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(
                MultiColumnListCell({
                  columnIndex: columnIndex.lastUpdated,
                  content: including(`${date} by ${userName},`),
                }),
              )
              .exists(),
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(
                MultiColumnListCell({
                  columnIndex: columnIndex.memberLibraries,
                  content: matching(regex),
                }),
              )
              .exists(),
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(Button({ icon: 'edit' }))
              .exists(),
            subjectSourcesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(Button({ icon: 'trash' }))
              .exists(),
          ]);
        });
      },
    );
  },
  // using in C594434
  verifyLocalSubjectSourceExists(subjectSourceName, tenantName, source = 'local', options = {}) {
    const { actions = [] } = options;

    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.name }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.memberLibraries }))
            .has({ content: tenantName }),
        ]);
        Object.values(reasonsActions).forEach((action) => {
          const actionButton = EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: columnIndex.actions }))
            .find(Button({ icon: action }));

          cy.expect(actions.includes(action) ? actionButton.exists() : actionButton.absent());
        });
      }),
    );
  },
  // using in C594434
  verifyNewAndSelectMembersButtonsState(
    newButtonDisabled = false,
    selectMembersButtonDisabled = false,
  ) {
    cy.expect(newButton.has({ disabled: newButtonDisabled }));
    cy.expect(selectMembersButton.has({ disabled: selectMembersButtonDisabled }));
  },
  // using in C594434
  verifySubjectSourceWithUserAndTenantNamesExist(sourceName, userName, tenantName) {
    cy.get('#editList-subjectsources').should('exist');

    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        const tenantMatches = [];

        cy.wrap(rowIndexes)
          .each((rowIndex) => {
            cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
              .find('[class*="mclCell-"]:nth-child(5)')
              .invoke('text')
              .then((text) => {
                const trimmedText = text.trim();
                if (trimmedText === tenantName) {
                  tenantMatches.push(trimmedText);
                }
              });
          })
          .then(() => {
            cy.wrap(null).then(() => {
              expect(tenantMatches).to.include(tenantName);
            });
          });
      },
    );
  },

  // using in C594434
  verifySubjectSourceWithUserAndTenantNamesAbsent(userName, tenantName) {
    cy.get('#editList-subjectsources').should('exist');

    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        cy.wrap(rowIndexes).each((rowIndex) => {
          cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex}"]`)
            .find('[class*="mclCell-"]:nth-child(5)')
            .invoke('text')
            .then((text) => {
              const trimmedText = text.trim();
              // Assert that tenantName is not found in any matching row
              expect(trimmedText).not.to.eq(tenantName);
            });
        });
      },
    );
  },
  verifySubjectSourceAbsent(name) {
    cy.get('#editList-subjectsources')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },
};
