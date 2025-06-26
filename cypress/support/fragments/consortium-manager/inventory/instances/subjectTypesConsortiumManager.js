import { including, matching } from '@interactors/html';
import {
  Button,
  Checkbox,
  EditableListRow,
  Modal,
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

const rootPane = Pane({ id: 'consortia-controlled-vocabulary-pane' });
const subjectTypesList = MultiColumnList({ id: 'editList-subjecttypes' });
const newButton = Button('+ New');
const selectMembersButton = Button('Select members');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const shareCheckbox = Checkbox('Share');
const confirmButton = Button('Confirm');
const keepEditingButton = Button('Keep editing');
const deleteButton = Button('Delete');
const nameField = TextField({ name: 'items[0].name' });
const confirmMemberLibrariesModal = Modal('Confirm member libraries');
const deleteSubjectTypeModal = Modal('Delete subject type');
const shareToAllModal = Modal('Confirm share to all');

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

function getRowIndexesByUserName(user) {
  const rowIndexes = [];

  return cy
    .get('#editList-subjecttypes')
    .find('[data-row-index]')
    .each(($row) => {
      const trimmedText = $row.find('[class*="mclCell-"]:nth-child(3)').first().text().trim();

      if (trimmedText.includes(user.lastName)) {
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
      const firstCellText = $row.find('[class*="mclCell-"]:nth-child(1)').first().text().trim();

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
        .find('[class*="mclCell-"]:nth-child(4)')
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText === searchValue) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find('[class*="mclCell-"]:nth-child(5) button[icon="edit"]')
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
        .find('[class*="mclCell-"]:nth-child(4)')
        .invoke('text')
        .then((text) => {
          const trimmedText = text.trim();

          if (trimmedText === searchValue) {
            foundRowIndex = rowIndex;

            cy.get(`#editList-subjecttypes [data-row-index="row-${rowIndex}"]`)
              .find('[class*="mclCell-"]:nth-child(5) button[icon="trash"]')
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
    .find('[class*="mclCell-"]:nth-child(1)')
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

  createNewWithValidationOfNameField(name, isUnique = true, shareCheckboxChecked = false) {
    clickNewButton();
    this.verifyNewRowInList(shareCheckboxChecked);
    fillNameField(name);
    if (!isUnique) {
      clickSaveButton();
      cy.expect([
        nameField.has({
          error: 'Name is already in use at one or more member libraries.',
        }),
        cancelButton.has({ disabled: false }),
        saveButton.has({ disabled: false }),
      ]);
    }
    clickSaveButton();
  },

  createNewShared(name, shareCheckboxChecked = false) {
    clickNewButton();
    this.verifyNewRowInList(shareCheckboxChecked);
    fillNameField(name);
    enableShareCheckbox();
    cy.expect(shareCheckbox.has({ checked: true }));
    clickSaveButton();
  },

  clickKeepEditingInConfirmMemberLibrariesModal() {
    cy.do(confirmMemberLibrariesModal.find(keepEditingButton).click());
    cy.expect(confirmMemberLibrariesModal.absent());
    this.verifyNewRowInList();
  },

  clickKeepEditingInConfirmShareToAllModal(shareCheckboxChecked = false) {
    cy.do(shareToAllModal.find(keepEditingButton).click());
    cy.expect(shareToAllModal.absent());
    this.verifyNewRowInList(shareCheckboxChecked);
  },

  clickCancelInConfirmMemberLibrariesModal() {
    cy.do(confirmMemberLibrariesModal.find(cancelButton).click());
    this.verifyNewRowInList();
  },

  clickConfirmInConfirmMemberLibraries(subjectTypeName, libraries) {
    this.verifyShareToMemberLibraresModal(subjectTypeName, libraries);
    cy.do(confirmMemberLibrariesModal.find(confirmButton).click());
    cy.expect([confirmMemberLibrariesModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(
      including(
        `${subjectTypeName} was successfully created for ${libraries[1]}, ${libraries[0]}, ${libraries[2]} libraries.`,
      ),
    );
  },

  confirmSharingToAll(subjectTypeName) {
    this.verifyShareToAllModal(subjectTypeName);
    cy.do(shareToAllModal.find(confirmButton).click());
    cy.expect([shareToAllModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(
      `${subjectTypeName} was successfully created for All libraries.`,
    );
  },

  confirmSharing(subjectTypeName, status = 'created') {
    this.verifyShareToAllModal(subjectTypeName);
    cy.do(confirmButton.click());
    cy.expect([shareToAllModal.absent(), rootPane.exists()]);
    if (status === 'updated') {
      InteractorsTools.checkCalloutMessage(
        `${subjectTypeName} was successfully updated for All libraries.`,
      );
    } else {
      InteractorsTools.checkCalloutMessage(
        `${subjectTypeName} was successfully created for All libraries.`,
      );
    }
  },

  createNewAndCancel(subjectTypeName, isUnique = true) {
    clickNewButton();
    fillNameField(subjectTypeName);
    if (!isUnique) {
      clickSaveButton();
      cy.expect([
        nameField.has({
          error: 'Name is already in use at one or more member libraries.',
        }),
        cancelButton.has({ disabled: false }),
        saveButton.has({ disabled: false }),
      ]);
    }
    cy.do(cancelButton.click());
    cy.wait(1500);
    cy.expect(rootPane.exists());
    this.verifyButtonStates();
  },

  edit(name, newName, user, tenantName) {
    getRowIndexesByUserName(user).then((rowIndexes) => {
      verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
        this.verifyEditRowInList(name, user, index);
        fillNameField(newName, index);
      });
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
    InteractorsTools.checkCalloutMessage(
      `${newName} was successfully updated for ${tenantName} library.`,
    );
  },

  editSharedToAllRecord(name, newName, userName, source) {
    this.getRowIndexesBySubjectTypeName(name).then((rowIndexes) => {
      this.clickEditByName(name);
      this.verifyEditRowInList(name, userName, rowIndexes[0], source);
      fillNameField(newName, rowIndexes[0]);
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButton();
  },

  cancel() {
    cy.do(cancelButton.click());
    newButton.has({ disabled: true });
    selectMembersButton.has({ disabled: true });
  },

  cancelDeletion(name) {
    this.verifyDelitionModal(name);
    cy.do(deleteSubjectTypeModal.find(cancelButton).click());
    cy.expect(deleteSubjectTypeModal.absent());
  },

  deleteByUserName(name, user, tenantName) {
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
    cy.expect([
      deleteSubjectTypeModal.exists(),
      deleteSubjectTypeModal.find(cancelButton).has({ disabled: false }),
      deleteSubjectTypeModal.find(deleteButton).has({ disabled: false }),
    ]);
    cy.do(deleteSubjectTypeModal.find(deleteButton).click());
    cy.expect([deleteSubjectTypeModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(`The subject type ${name} was successfully deleted.`);
  },

  deleteBySubjectTypeName(name) {
    this.clickDeleteByName(name);
    cy.expect([
      deleteSubjectTypeModal.exists(),
      deleteSubjectTypeModal.find(cancelButton).has({ disabled: false }),
      deleteSubjectTypeModal.find(deleteButton).has({ disabled: false }),
    ]);
    cy.do(deleteSubjectTypeModal.find(deleteButton).click());
    cy.expect([deleteSubjectTypeModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(`The subject type ${name} was successfully deleted.`);
  },

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

  verifyShareToMemberLibraresModal(subjectTypeName, libraries) {
    cy.expect([
      confirmMemberLibrariesModal.exists(),
      Modal({
        content: including(`${subjectTypeName} will be saved for the member libraries:`),
      }).exists(),
      Modal({ content: including(`${libraries[0]}`) }).exists(),
      Modal({ content: including(`${libraries[1]}`) }).exists(),
      Modal({ content: including(`${libraries[2]}`) }).exists(),
      confirmMemberLibrariesModal.find(keepEditingButton).has({ disabled: false }),
      confirmMemberLibrariesModal.find(confirmButton).has({ disabled: false }),
    ]);
  },

  verifyShareToAllModal(subjectTypeName) {
    cy.expect([
      shareToAllModal.exists(),
      Modal({
        content: including(`Are you sure you want to share ${subjectTypeName} with ALL members?`),
      }).exists(),
      shareToAllModal.find(keepEditingButton).has({ disabled: false }),
      shareToAllModal.find(confirmButton).has({ disabled: false }),
    ]);
  },

  verifyNewRowInList(shareCheckboxChecked = true) {
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
      shareCheckbox.has({ disabled: shareCheckboxChecked }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

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

  verifyCreatedInList(subjectType, user) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const allowedTypes = [tenantNames.central, tenantNames.college, tenantNames.university];
    const regex = new RegExp(`^(${allowedTypes.join('|')})$`);

    getRowIndexesByUserName(user).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(3);
      rowIndexes.forEach((index) => {
        cy.expect([
          subjectTypesList
            .find(MultiColumnListRow({ indexRow: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0, content: subjectType.name }))
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
                content: including(`${date} by ${user.lastName},`),
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

  verifyEditedInList(name, editedName) {
    getRowIndexesBySubjectTypeName(editedName).then((rowIndexes) => {
      expect(rowIndexes).to.have.length(1);
      cy.expect([
        subjectTypesList
          .find(MultiColumnListRow({ indexRow: `row-${rowIndexes[0]}` }))
          .find(MultiColumnListCell({ columnIndex: 0, content: editedName }))
          .exists(),
      ]);
    });
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
    cy.expect([newButton.has({ disabled: false }), selectMembersButton.has({ disabled: false })]);
  },

  verifySubjectTypesAfterDeleting(user) {
    getRowIndexesByUserName(user).then((rowIndexes) => {
      // verify that list contains only two subject types created by current user
      expect(rowIndexes).to.have.length(2);
    });
    cy.expect([newButton.has({ disabled: false }), selectMembersButton.has({ disabled: false })]);
  },

  verifySubjectTypeExists(subjectTypeName, tenantName, source = 'local', options = {}) {
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

  validateNameFieldConditions(nameValue, isUnique) {
    cy.expect(nameField.has({ placeholder: 'name' }));
    fillNameField(nameValue);
    enableShareCheckbox();

    if (!nameValue) {
      clickSaveButton();
      cy.expect(nameField.has({ error: 'Please fill this in to continue' }));
      saveButton.has({ disabled: false });
      cy.wait(1500);
    } else if (!isUnique) {
      clickSaveButton();
      cy.expect(
        nameField.has({ error: 'Name is already in use at one or more member libraries.' }),
      );
      saveButton.has({ disabled: false });
      cy.wait(1500);
    } else {
      clickSaveButton();
      cy.wait(1500);
    }
  },

  verifyCreatedSubjectType({ name: subjectTypeName, actions = [] }) {
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
            .has({ content: 'consortium' }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: `${date} by System, System user - mod-consortia-keycloak ` }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
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

  verifyButtonStates(newButtonDisabled = false, selectMembersButtonDisabled = false) {
    cy.expect(newButton.has({ disabled: newButtonDisabled }));
    cy.expect(selectMembersButton.has({ disabled: selectMembersButtonDisabled }));
  },

  verifyDelitionModal(name) {
    cy.expect([
      deleteSubjectTypeModal.exists(),
      deleteSubjectTypeModal.has({
        content: including(`The subject type ${name} will be deleted.`),
      }),
      deleteSubjectTypeModal.find(cancelButton).has({ disabled: false }),
      deleteSubjectTypeModal.find(deleteButton).has({ disabled: false }),
    ]);
  },
};
