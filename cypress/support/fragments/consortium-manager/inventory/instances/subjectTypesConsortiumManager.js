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
const nameField = TextField({ placeholder: 'name' });

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

function verifyColumnAndClickEdit(rowIndexes, searchValue) {
  let foundRowIndex;

  return cy
    .wrap(rowIndexes)
    .each((rowIndex) => {
      cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.memberLibraries + 1})`)
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText.includes(searchValue)) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="edit"]`)
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
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.memberLibraries + 1})`)
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText === searchValue) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find(
                `[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="trash"]`,
              )
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
    .find(`[class*="mclCell-"]:nth-child(${columnIndex.name + 1})`)
    .each(($cell) => {
      cy.wrap($cell)
        .invoke('text')
        .then((text) => {
          expect(text.trim()).not.to.eq(name);
        });
    });
  cy.get('#editList-subjecttypes').should('exist').and('be.visible');
}

function findRowIndexBySubjectTypeName(name) {
  return cy
    .get('#editList-subjecttypes')
    .find(`[class*="mclCell-"]:nth-child(${columnIndex.name + 1})`)
    .contains(name)
    .parents('[data-row-index]')
    .invoke('attr', 'data-row-index')
    .then((rowAttr) => Number(rowAttr.replace('row-', '')));
}

function verifySubjectTypeRowContent(rowIndex, subjectTypeName, source, userName, memberLibraries) {
  const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

  cy.expect([
    rootPane.exists(),
    EditableListRow({ index: rowIndex })
      .find(MultiColumnListCell({ columnIndex: columnIndex.name }))
      .has({ content: subjectTypeName }),

    EditableListRow({ index: rowIndex })
      .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
      .has({ content: source }),

    EditableListRow({ index: rowIndex })
      .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
      .has({ content: `${date} by ${userName} ` }),

    EditableListRow({ index: rowIndex })
      .find(MultiColumnListCell({ columnIndex: columnIndex.memberLibraries }))
      .has({ content: memberLibraries }),
  ]);
}

function verifySubjectTypeRowActions(rowIndex, actions) {
  const actionsCell = EditableListRow({ index: rowIndex }).find(
    MultiColumnListCell({ columnIndex: columnIndex.actions }),
  );

  Object.values(reasonsActions).forEach((action) => {
    const button = actionsCell.find(Button({ icon: action }));
    cy.expect(actions.includes(action) ? button.exists() : button.absent());
  });
}

function getRowIndexesByColumnValue(columnIdx, matcher) {
  const rowIndexes = [];
  cy.reload();

  cy.get('#editList-subjecttypes').should('exist').and('be.visible');
  cy.wait(5000);

  return cy
    .get('#editList-subjecttypes')
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

export default {
  clickNewButton,
  clickSaveButton,
  enableShareCheckbox,
  fillNameField,
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

  // using in C594406, C594404
  validateNameFieldWithError(message) {
    cy.expect([
      nameField.has({ error: message }),
      saveButton.has({ disabled: false }),
      cancelButton.has({ disabled: false }),
    ]);
    cy.wait(1000);
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
      this.validateNameFieldWithError('Name is already in use at one or more member libraries.');
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
      this.validateNameFieldWithError('Name is already in use at one or more member libraries.');
    }

    cy.do(cancelButton.click());
    cy.expect(rootPane.exists());
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

    const action = subjectTypeState === 'updated' ? 'updated' : 'created';
    InteractorsTools.checkCalloutMessage(
      `${subjectTypeName} was successfully ${action} for All libraries.`,
    );
  },

  // using in C594411
  editSubjectTypeByTenantName(name, newName, userName, tenantName) {
    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
          this.verifyEditRowInList(name, userName, index);
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

  // using in C594405
  editSharedToAllRecord(name, newName, userName, source) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text === name).then(([index]) => {
      this.clickEditByName(name);
      this.verifyEditRowInList(name, userName, index, source);
      fillNameField(newName, index);
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
  deleteSubjectTypeByUserAndTenantNames(name, userName, tenantName) {
    cy.wait(1500);
    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
        verifyColumnAndClickDelete(rowIndexes, tenantName).then((index) => {
          cy.do(
            subjectTypesList
              .find(MultiColumnListRow({ indexRow: `row-${index}` }))
              .find(Button({ icon: 'trash' }))
              .click(),
          );
        });
      },
    );
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
    getRowIndexesByColumnValue(columnIndex.name, (text) => text === name).then(([index]) => {
      cy.get(`#editList-subjecttypes [data-row-index="row-${index}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="trash"]`)
        .click();
    });
  },

  // using in C594405
  clickEditByName(name) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text === name).then(([index]) => {
      cy.get(`#editList-subjecttypes [data-row-index="row-${index}"]`)
        .find(`[class*="mclCell-"]:nth-child(${columnIndex.actions + 1}) button[icon="edit"]`)
        .click();
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
  verifyNewSubjectTypeRowIsInEditMode(
    subjectTypeName,
    isCheckboxChecked = true,
    isCheckboxDisabled = false,
  ) {
    const row = EditableListRow({ index: 0 });

    cy.expect([
      nameField.has({ value: subjectTypeName }),
      row.find(MultiColumnListCell({ columnIndex: columnIndex.source })).has({ content: 'local' }),
      row
        .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: isCheckboxChecked, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },
  // using in C594404, C594411
  verifyNewRecordRowBeforeFilling(isCheckboxDisabled = false) {
    const row = EditableListRow({ index: 0 });

    cy.expect([
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
      nameField.has({ placeholder: 'name', disabled: false }),
      row.find(MultiColumnListCell({ columnIndex: columnIndex.source })).has({ content: 'local' }),
      row
        .find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ checked: false, disabled: isCheckboxDisabled }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  // using in C594411
  verifyEditRowInList(name, userLastName, rowIndex, source = 'local') {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const row = subjectTypesList.find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }));

    cy.expect([
      TextField({ name: `items[${rowIndex}].name` }).has({ value: name, disabled: false }),
      row.find(MultiColumnListCell({ columnIndex: columnIndex.source })).has({ content: source }),
      row
        .find(
          MultiColumnListCell({
            columnIndex: columnIndex.lastUpdated,
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
  verifyThreeLocalSubjectTypesExist(subjectTypeName, userName) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const allowedTypes = [tenantNames.central, tenantNames.college, tenantNames.university];
    const regex = new RegExp(`^(${allowedTypes.join('|')})$`);

    getRowIndexesByColumnValue(columnIndex.lastUpdated, (text) => text.includes(userName)).then(
      (rowIndexes) => {
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
                  content: including(`${date} by ${userName},`),
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
      },
    );
  },
  // using in C594406, C594404, C594405, C594397
  verifySharedToAllMembersSubjectTypeExists(
    subjectTypeName,
    source,
    userName,
    memberLibraries,
    options = {},
  ) {
    const { actions = [] } = options;

    findRowIndexBySubjectTypeName(subjectTypeName).then((rowIndex) => {
      verifySubjectTypeRowContent(rowIndex, subjectTypeName, source, userName, memberLibraries);
      verifySubjectTypeRowActions(rowIndex, actions);
    });
  },

  // using in C594411
  verifyEditedLocalSubjectTypeExists(name) {
    getRowIndexesByColumnValue(columnIndex.name, (text) => text === name).then(([index]) => {
      cy.expect([
        subjectTypesList
          .find(MultiColumnListRow({ indexRow: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 0, content: name }))
          .exists(),
      ]);
    });
  },
  // using in C594411
  getAllSubjectTypeRowIndexesByName(subjectTypeName) {
    const matchingIndexes = [];

    return cy
      .get('#editList-subjecttypes')
      .find('[data-row-index]')
      .each(($row) => {
        const $cells = $row.find('[class*="mclCell-"]');
        const nameCellText = $cells.eq(columnIndex.name).text().trim();

        if (nameCellText === subjectTypeName) {
          const rowAttr = $row.attr('data-row-index');
          const index = rowAttr?.replace(/^row-/, '');
          if (index !== undefined) matchingIndexes.push(index);
        }
      })
      .then(() => matchingIndexes);
  },

  // using in C594411
  verifyLocalSubjectTypeNotEdited(name, recordNumber) {
    this.getAllSubjectTypeRowIndexesByName(name).then((indexes) => {
      expect(indexes.length).to.equal(recordNumber);
    });
  },

  // using in C594411, C594397
  verifyLocalSubjectTypeExists(subjectTypeName, tenantName, source = 'local', options = {}) {
    const { actions = [] } = options;

    cy.do(
      MultiColumnListCell({ content: subjectTypeName }).perform((element) => {
        const rowIndex = Number(
          element.closest('[data-row-index]').getAttribute('data-row-index').replace('row-', ''),
        );
        const row = EditableListRow({ index: rowIndex });

        cy.expect([
          row
            .find(MultiColumnListCell({ columnIndex: columnIndex.name }))
            .has({ content: subjectTypeName }),
          row
            .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
            .has({ content: source }),
          row
            .find(MultiColumnListCell({ columnIndex: columnIndex.memberLibraries }))
            .has({ content: tenantName }),
        ]);

        Object.values(reasonsActions).forEach((action) => {
          const actionButton = row
            .find(MultiColumnListCell({ columnIndex: columnIndex.actions }))
            .find(Button({ icon: action }));

          cy.expect(actions.includes(action) ? actionButton.exists() : actionButton.absent());
        });
      }),
    );
  },

  // using in C594404, C594411
  verifyNewAndSelectMembersButtonsState(
    newButtonDisabled = false,
    selectMembersButtonDisabled = false,
  ) {
    cy.expect([
      newButton.has({ disabled: newButtonDisabled }),
      selectMembersButton.has({ disabled: selectMembersButtonDisabled }),
    ]);
  },
};
