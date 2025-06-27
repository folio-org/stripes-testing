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

function clickNewButton() {
  cy.do(newButton.click());
}

function enableShareCheckbox() {
  cy.do(shareCheckbox.click());
}

function clickSaveButton() {
  cy.do(saveButton.click());
}

function fillNameField(value, rowIndex = 0) {
  cy.do(TextField({ name: `items[${rowIndex}].name` }).fillIn(value));
}

function getRowIndexesBySubjectSourceName(name) {
  const rowIndexes = [];

  return cy
    .get('#editList-subjectsources')
    .find('[data-row-index]')
    .each(($row) => {
      const firstCellText = $row.find('[class*="mclCell-"]:nth-child(1)').first().text().trim();

      if (firstCellText === name) {
        const rowIndex = $row.attr('data-row-index');
        rowIndexes.push(rowIndex.replace(/^row-/, '') || '');
      }
    })
    .then(() => rowIndexes);
}

function getRowIndexesByUserName(userName) {
  const rowIndexes = [];

  return cy
    .get('#editList-subjectsources')
    .find('[data-row-index]')
    .each(($row) => {
      const trimmedText = $row.find('[class*="mclCell-"]:nth-child(4)').first().text().trim();

      if (trimmedText.includes(userName)) {
        const rowIndex = $row.attr('data-row-index');
        rowIndexes.push(rowIndex.replace(/^row-/, '') || '');
      }
    })
    .then(() => rowIndexes);
}

function verifyColumnAndClickDelete(rowIndexes, searchValue) {
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
              .find('[class*="mclCell-"]:nth-child(6) button[icon="trash"]')
              .click();
          }
        });
    })
    .then(() => {
      return foundRowIndex;
    });
}

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  clickNewButton,
  clickSaveButton,
  enableShareCheckbox,
  fillNameField,
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Subject sources');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
  // using in C594434
  clickCancelButton() {
    cy.do(cancelButton.click());
  },
  // using in C594429
  createSharedWithAllMembersSubjectSourceWithValidationNameField(name, nameValidationState) {
    if (nameValidationState === 'empty') {
      fillNameField(name);
      clickSaveButton();
      this.validateNameFieldOnEmptySave();
    } else if (nameValidationState === 'duplicate') {
      fillNameField(name);
      clickSaveButton();
      this.validateNameFieldOnDuplicateSave();
    } else {
      fillNameField(name);
      cy.wait(1000);
      enableShareCheckbox();
      clickSaveButton();
    }
  },
  // using in C594429
  createSharedWithAllMembersSubjectSourceAndCancel(name) {
    clickNewButton();
    fillNameField(name);
    enableShareCheckbox();
    this.clickCancelButton();
    cy.wait(1500);
    cy.expect(rootPane.exists());
  },
  // using in C594434
  createLocalSubjectSource(name, nameValidationState = 'unique') {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling(true);
    if (nameValidationState === 'duplicate') {
      fillNameField(name);
      clickSaveButton();
      this.validateNameFieldOnDuplicateSave();
    } else {
      fillNameField(name);
      clickSaveButton();
    }
  },
  // using in C594434
  clickKeepEditingAndVerifyEditMode(name, isCheckboxChecked = false, isCheckboxDisabled = true) {
    ConfirmCreateModal.waitLoadingConfirmCreate(name);
    ConfirmCreateModal.clickKeepEditing();
    this.verifyNewSubjectSourceRowIsInEditMode(name, isCheckboxChecked, isCheckboxDisabled);
  },

  // using in C594428
  createSharedWithAllMembersSubjectSource(subjectSourceName) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling();
    fillNameField(subjectSourceName);
    enableShareCheckbox();
    clickSaveButton();
  },
  validateNameFieldOnEmptySave() {
    cy.expect(nameField.has({ error: 'Please fill this in to continue' }));
    saveButton.has({ disabled: false });
    cancelButton.has({ disabled: false });
    cy.wait(1000);
  },
  validateNameFieldOnDuplicateSave() {
    cy.expect(nameField.has({ error: 'Name is already in use at one or more member libraries.' }));
    saveButton.has({ disabled: false });
    cancelButton.has({ disabled: false });
    cy.wait(1000);
  },
  // using in C594428, C594429
  confirmShareWithAllMembers(subjectSourceName, subjectSourceState = 'created') {
    ConfirmShareModal.waitLoadingConfirmShareToAll(subjectSourceName);
    ConfirmShareModal.clickConfirm();
    cy.expect(rootPane.exists());
    if (subjectSourceState === 'updated') {
      InteractorsTools.checkCalloutMessage(
        `${subjectSourceName} was successfully updated for All libraries.`,
      );
    } else {
      InteractorsTools.checkCalloutMessage(
        `${subjectSourceName} was successfully created for All libraries.`,
      );
    }
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
  // using in C594434
  deleteSubjectSourceByUserAndTenantNames(name, user, tenantName) {
    cy.wait(1500);
    getRowIndexesByUserName(user).then((rowIndexes) => {
      verifyColumnAndClickDelete(rowIndexes, tenantName).then((index) => {
        cy.do(
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      });
    });
    DeleteCancelReason.waitLoadingDeleteModal('subject source', name);
    DeleteCancelReason.clickDelete();
    cy.expect(rootPane.exists());
    InteractorsTools.checkCalloutMessage(`The subject source ${name} was successfully deleted.`);
  },
  // using in C594428
  editSubjectSource(name, newName) {
    getRowIndexesBySubjectSourceName(name).then((rowIndex) => {
      cy.get(`#editList-subjectsources [data-row-index="row-${rowIndex[0]}"]`)
        .find('[class*="mclCell-"]:nth-child(6) button[icon="edit"]')
        .click();
      this.verifyEditSubjectSourceRowIsInEditMode(name, rowIndex);
      fillNameField(newName, rowIndex);
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    this.confirmShareWithAllMembers(newName, 'updated');
  },
  // using in C594434
  editSubjectSourceByTenantName(name, newName, userName, tenantName) {
    getRowIndexesByUserName(userName).then((rowIndexes) => {
      this.verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
        this.verifyEditRowInList(name, userName, index);
        fillNameField(newName, index);
      });
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    InteractorsTools.checkCalloutMessage(
      including(`${newName} was successfully updated for ${tenantName} library.`),
    );
  },
  // using in C594434
  verifyLocalSubjectSourceNotEdited(name) {
    getRowIndexesBySubjectSourceName(name).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(2);
      rowIndexes.forEach((index) => {
        cy.expect([
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0, content: name }))
            .exists(),
        ]);
      });
    });
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
  verifyEditSubjectSourceRowIsInEditMode(name, rowIndex) {
    cy.expect([
      TextField({ name: `items[${rowIndex}].name` }).has({ value: name, disabled: false }),
      subjectSourcesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'consortium' }),
      subjectSourcesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: including('System, System user - mod-consortia-keycloak ') }),
      shareCheckbox.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
    ]);
  },
  // using in C594428, C594434
  verifyNewRecordRowBeforeFilling(IsShareCheckboxDisabled = false) {
    cy.expect([
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
      nameField.has({ placeholder: 'name', disabled: false }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: false, disabled: IsShareCheckboxDisabled }),
      Button('Cancel').has({ disabled: false }),
      Button('Save').has({ disabled: false }),
    ]);
  },
  // using in C594434
  verifyNewSubjectSourceRowIsInEditMode(
    sourceName,
    isCheckboxChecked = true,
    isCheckboxDisabled = false,
  ) {
    cy.expect([
      TextField({ placeholder: 'name' }).has({ value: sourceName }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: isCheckboxChecked, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  // using in C594428, C594429
  verifySharedSubjectSourceExists({ name: subjectSourceName, actions = [] }) {
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });

    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: 'consortium' }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: including('System, System user - mod-consortia-keycloak ') }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .has({ content: 'All' }),
        ]);
        Object.values(reasonsActions).forEach((action) => {
          const buttonSelector = EditableListRow({ index: rowIndex })
            .find(actionsCell)
            .find(Button({ icon: action }));
          if (actions.includes(action)) {
            cy.expect(buttonSelector.exists());
          } else {
            cy.expect(buttonSelector.absent());
          }
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
  verifyThreeLocalSubjectSourcesExist(subjectSourceName, user) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const allowedSources = [tenantNames.central, tenantNames.college, tenantNames.university];
    const regex = new RegExp(`^(${allowedSources.join('|')})$`);

    getRowIndexesByUserName(user).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(3);
      rowIndexes.forEach((index) => {
        cy.expect([
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0, content: subjectSourceName }))
            .exists(),
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 2, content: 'local' }))
            .exists(),
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(
              MultiColumnListCell({
                columnIndex: 3,
                content: including(`${date} by ${user},`),
              }),
            )
            .exists(),
          subjectSourcesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(
              MultiColumnListCell({
                columnIndex: 4,
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
    });
  },
  // using in C594434
  verifyLocalSubjectSourceExists(subjectSourceName, tenantName, source = 'local', options = {}) {
    const { actions = [] } = options;
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });

    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .has({ content: tenantName }),
        ]);
        Object.values(reasonsActions).forEach((action) => {
          const buttonSelector = EditableListRow({ index: rowIndex })
            .find(actionsCell)
            .find(Button({ icon: action }));
          if (actions.includes(action)) {
            cy.expect(buttonSelector.exists());
          } else {
            cy.expect(buttonSelector.absent());
          }
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

    getRowIndexesByUserName(userName).then((rowIndexes) => {
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
    });
  },

  // using in C594434
  verifySubjectSourceWithUserAndTenantNamesAbsent(userName, tenantName) {
    cy.get('#editList-subjectsources').should('exist');
    getRowIndexesByUserName(userName).then((rowIndexes) => {
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
    });
  },
  verifySubjectSourceAbsent(name) {
    cy.get('#editList-subjectsources')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },
};
