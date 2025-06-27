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
import { tenantNames } from '../../../../dictionary/affiliations';
import DateTools from '../../../../utils/dateTools';
import InteractorsTools from '../../../../utils/interactorsTools';
import ConsortiumManagerApp from '../../consortiumManagerApp';
import ConfirmCreateModal from '../../modal/confirm-create';
import ConfirmShareModal from '../../modal/confirm-share';
import DeleteCancelReason from '../../modal/delete-cancel-reason';

const rootPane = Pane({ id: 'consortia-controlled-vocabulary-pane' });
const subjectTypesList = MultiColumnList({ id: 'editList-subjecttypes' });
const newButton = Button('+ New');
const selectMembersButton = Button('Select members');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const shareCheckbox = Checkbox('Share');
const nameField = TextField({ name: 'items[0].name' });

const columnIndex = {
  name: 0,
  source: 1,
  lastUpdated: 2,
  memberLibraries: 3,
  actions: 4,
};

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
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

function fillNameField(value, rowIndex = 0) {
  cy.do(TextField({ name: `items[${rowIndex}].name` }).fillIn(value));
}

function getRowIndexesByUserName(userName) {
  const rowIndexes = [];

  return cy
    .get('#editList-subjecttypes')
    .find('[data-row-index]')
    .each(($row) => {
      const trimmedText = $row
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.lastUpdated})`)
        .first()
        .text()
        .trim();

      if (trimmedText.includes(userName)) {
        const rowIndex = $row.attr('data-row-index');
        rowIndexes.push(rowIndex.replace(/^row-/, '') || '');
      }
    })
    .then(() => rowIndexes);
}

function getRowIndexesBySubjectTypeName(name) {
  const rowIndexes = [];

  return cy
    .get('#editList-subjecttypes')
    .find('[data-row-index]')
    .each(($row) => {
      const firstCellText = $row
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.name})`)
        .first()
        .text()
        .trim();

      if (firstCellText === name) {
        const rowIndex = $row.attr('data-row-index');
        rowIndexes.push(rowIndex.replace(/^row-/, '') || '');
      }
    })
    .then(() => rowIndexes);
}

function verifyColumnAndClickEdit(rowIndexes, searchValue) {
  let foundRowIndex;

  return cy
    .wrap(rowIndexes)
    .each((rowIndex) => {
      cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.memberLibraries})`)
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText === searchValue) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions}) button[icon="edit"]`)
              .click();
          }
        });
    })
    .then(() => {
      return foundRowIndex;
    });
}

function verifyColumnAndClickDelete(rowIndexes, searchValue) {
  let foundRowIndex;

  return cy
    .wrap(rowIndexes)
    .each((rowIndex) => {
      cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.memberLibraries})`)
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText === searchValue) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions}) button[icon="trash"]`)
              .click();
          }
        });
    })
    .then(() => {
      return foundRowIndex;
    });
}

function verifySubjectTypeAbsent(name) {
  cy.get('#editList-subjecttypes')
    .find(`[class*="mclCell-"]:nth-child(${columnIndex.name})`)
    .each(($cell) => {
      cy.wrap($cell).invoke('text').should('not.eq', name);
    });
}

export default {
  clickNewButton,
  clickSaveButton,
  enableShareCheckbox,
  fillNameField,
  getRowIndexesByUserName,
  getRowIndexesBySubjectTypeName,
  verifyColumnAndClickEdit,
  verifySubjectTypeAbsent,
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Subject types');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  // using in C594406
  createSharedWithAllMembersSubjectTypeWithValidationNameField(name, nameValidationState) {
    enableShareCheckbox();
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
      clickSaveButton();
    }
  },

  // using in C594404, C594405
  createSubjectTypeSharedWithAllMembers(name) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling();
    fillNameField(name);
    enableShareCheckbox();
    cy.expect(shareCheckbox.has({ checked: true }));
    clickSaveButton();
  },

  // using in C594411
  createLocalSubjectTypeSavedForMemberLibraries(name, isUniqueSubjectTypeName = true) {
    clickNewButton();
    this.verifyNewRecordRowBeforeFilling(true);
    fillNameField(name);
    if (!isUniqueSubjectTypeName) {
      clickSaveButton();
      this.validateNameFieldOnDuplicateSave();
    }
    cy.expect(shareCheckbox.has({ checked: false, disabled: true }));
    clickSaveButton();
  },

  // using in C594406
  createSharedWithAllMembersSubjectTypeAndCancel(subjectTypeName, isUniqueSubjectTypeName = true) {
    clickNewButton();
    fillNameField(subjectTypeName);
    enableShareCheckbox();
    if (!isUniqueSubjectTypeName) {
      clickSaveButton();
      this.validateNameFieldOnDuplicateSave();
    }
    cy.do(cancelButton.click());
    cy.wait(1500);
    cy.expect(rootPane.exists());
  },
  // using in C594406, C594404
  validateNameFieldOnEmptySave() {
    cy.expect(nameField.has({ error: 'Please fill this in to continue' }));
    saveButton.has({ disabled: false });
    cancelButton.has({ disabled: false });
    cy.wait(1000);
  },
  // using in C594406, C594404
  validateNameFieldOnDuplicateSave() {
    cy.expect(nameField.has({ error: 'Name is already in use at one or more member libraries.' }));
    saveButton.has({ disabled: false });
    cancelButton.has({ disabled: false });
    cy.wait(1000);
  },

  // using in C594411
  confirmSaveForMemberLibraries(subjectTypeName, firstTenant, secondTenant, thirdTenant) {
    ConfirmCreateModal.waitLoadingConfirmCreate(subjectTypeName);
    ConfirmCreateModal.clickConfirm();
    InteractorsTools.checkCalloutMessage(
      `${subjectTypeName} was successfully created for ${firstTenant}, ${secondTenant}, ${thirdTenant} libraries.`,
    );
    cy.expect(rootPane.exists());
  },

  // using in C594406, C594404, C594405
  confirmShareWithAllMembers(subjectTypeName, subjectTypeState = 'created') {
    ConfirmShareModal.waitLoadingConfirmShareToAll(subjectTypeName);
    ConfirmShareModal.clickConfirm();
    cy.expect(rootPane.exists());
    if (subjectTypeState === 'updated') {
      InteractorsTools.checkCalloutMessage(
        `${subjectTypeName} was successfully updated for All libraries.`,
      );
    } else {
      InteractorsTools.checkCalloutMessage(
        `${subjectTypeName} was successfully created for All libraries.`,
      );
    }
  },

  // using in C594411
  editSubjectTypeByTenantName(name, newName, user, tenantName) {
    getRowIndexesByUserName(user).then((rowIndexes) => {
      verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
        this.verifyEditRowInList(name, user, index);
        fillNameField(newName, index);
      });
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    InteractorsTools.checkCalloutMessage(
      including(`${newName} was successfully updated for ${tenantName} library.`),
    );
  },

  // using in C594405
  editSharedToAllRecord(name, newName, userName, source) {
    this.getRowIndexesBySubjectTypeName(name).then((rowIndexes) => {
      this.clickEditByName(name);
      this.verifyEditRowInList(name, userName, rowIndexes[0], source);
      fillNameField(newName, rowIndexes[0]);
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
  },

  // using in C594404, C594411
  cancel() {
    cy.do(cancelButton.click());
    newButton.has({ disabled: true });
    selectMembersButton.has({ disabled: true });
  },

  // using in C594411
  deleteSubjectTypeByUserAndTenantNames(name, user, tenantName) {
    cy.wait(1500);
    getRowIndexesByUserName(user).then((rowIndexes) => {
      verifyColumnAndClickDelete(rowIndexes, tenantName).then((index) => {
        cy.do(
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      });
    });
    DeleteCancelReason.waitLoadingDeleteModal('subject type', name);
    DeleteCancelReason.clickDelete();
    cy.expect(rootPane.exists());
    InteractorsTools.checkCalloutMessage(`The subject type ${name} was successfully deleted.`);
  },
  // using in C594404
  deleteBySubjectTypeName(name) {
    this.clickDeleteByName(name);
    DeleteCancelReason.waitLoadingDeleteModal('subject type', name);
    DeleteCancelReason.clickDelete();
    cy.expect(rootPane.exists());
    InteractorsTools.checkCalloutMessage(`The subject type ${name} was successfully deleted.`);
  },

  // using in C594404
  clickDeleteByName(name) {
    getRowIndexesBySubjectTypeName(name).then((rowIndexes) => {
      cy.do(
        subjectTypesList
          .find(MultiColumnListRow({ indexRow: `row-${rowIndexes[0]}` }))
          .find(Button({ icon: 'trash' }))
          .click(),
      );
    });
  },

  // using in C594405
  clickEditByName(name) {
    getRowIndexesBySubjectTypeName(name).then((rowIndexes) => {
      cy.do(
        subjectTypesList
          .find(MultiColumnListRow({ indexRow: `row-${rowIndexes[0]}` }))
          .find(Button({ icon: 'edit' }))
          .click(),
      );
    });
  },
  // using in C594397
  createSharedSubjectTypeViaApi(typeId, subjectTypeName, consortiaId) {
    return cy.okapiRequest({
      method: 'POST',
      path: `consortia/${consortiaId}/sharing/settings`,
      body: {
        url: '/subject-types',
        settingId: typeId,
        payload: {
          source: 'local',
          name: subjectTypeName,
          id: typeId,
        },
      },
      isDefaultSearchParamsRequired: false,
    });
  },
  // using in C594397
  deleteSharedSubjectTypeViaApi(consortiaId, id, subjectTypeName) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `consortia/${consortiaId}/sharing/settings/${id}`,
      body: {
        url: '/subject-types',
        settingId: id,
        payload: { id, name: subjectTypeName, source: 'consortium' },
      },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  // using in C594406, C594411
  verifyNewRecordRowBeforeFilling(isCheckboxDisabled = false) {
    cy.expect([
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
      nameField.has({ placeholder: 'name', disabled: false }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: false, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  // using in C594404, C594411
  verifyNewSubjectTypeRowIsInEditMode(
    subjectTypeName,
    isCheckboxChecked = true,
    isCheckboxDisabled = false,
  ) {
    cy.expect([
      TextField({ placeholder: 'name' }).has({ value: subjectTypeName }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: isCheckboxChecked, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  // using in C594411
  verifyEditRowInList(name, userLastName, rowIndex, source) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

    cy.expect([
      TextField({ name: `items[${rowIndex}].name` }).has({ value: name, disabled: false }),
      subjectTypesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: source || 'local' }),
      subjectTypesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(
          MultiColumnListCell({
            columnIndex: 2,
            content: including(`${date} by ${userLastName}`),
          }),
        )
        .exists(),
      shareCheckbox.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
    ]);
  },

  // using in C594411
  verifyThreeLocalSubjectTypesExist(subjectTypeName, user) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const allowedTypes = [tenantNames.central, tenantNames.college, tenantNames.university];
    const regex = new RegExp(`^(${allowedTypes.join('|')})$`);

    getRowIndexesByUserName(user).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(3);
      rowIndexes.forEach((index) => {
        cy.expect([
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0, content: subjectTypeName }))
            .exists(),
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 1, content: 'local' }))
            .exists(),
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(
              MultiColumnListCell({
                columnIndex: 2,
                content: including(`${date} by ${user},`),
              }),
            )
            .exists(),
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(
              MultiColumnListCell({
                columnIndex: 3,
                content: matching(regex),
              }),
            )
            .exists(),
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(Button({ icon: 'edit' }))
            .exists(),
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(Button({ icon: 'trash' }))
            .exists(),
        ]);
      });
    });
  },

  // using in C594406, C594404, C594405, C594397
  verifySharedToAllMembersSubjectTypeExists(
    subjectTypeName,
    source,
    userName,
    memberLibrares,
    options = {},
  ) {
    const { actions = [] } = options;
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });

    cy.do(
      MultiColumnListCell({ content: subjectTypeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectTypeName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: `${date} by ${userName} ` }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: memberLibrares }),
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

  // using in C594411
  verifyEditedLocalSubjectTypeExists(editedName) {
    getRowIndexesBySubjectTypeName(editedName).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(1);
      cy.expect([
        subjectTypesList
          .find(MultiColumnListRow({ indexRow: `row-${rowIndexes[0]}` }))
          .find(MultiColumnListCell({ columnIndex: 0, content: editedName }))
          .exists(),
      ]);
    });
  },

  // using in C594411
  verifyLocalSubjectTypeNotEdited(name) {
    getRowIndexesBySubjectTypeName(name).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(2);
      rowIndexes.forEach((index) => {
        cy.expect([
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0, content: name }))
            .exists(),
        ]);
      });
    });
  },

  // using in C594411, C594397
  verifyLocalSubjectTypeExists(subjectTypeName, tenantName, source = 'local', options = {}) {
    const { actions = [] } = options;
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });

    cy.do(
      MultiColumnListCell({ content: subjectTypeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectTypeName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
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

  // using in C594404, C594411
  verifyNewAndSelectMembersButtonsState(
    newButtonDisabled = false,
    selectMembersButtonDisabled = false,
  ) {
    cy.expect(newButton.has({ disabled: newButtonDisabled }));
    cy.expect(selectMembersButton.has({ disabled: selectMembersButtonDisabled }));
  },
};
