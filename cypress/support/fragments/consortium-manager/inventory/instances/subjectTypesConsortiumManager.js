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
const confirmMemberLibrariesModal = Modal('Confirm member libraries');
const deleteSubjectTypeModal = Modal('Delete subject type');
const confirmButton = confirmMemberLibrariesModal.find(Button('Confirm'));
const keepEditingButtonInConfirmModal = confirmMemberLibrariesModal.find(Button('Keep editing'));
const cancelButtonInConfirmModal = confirmMemberLibrariesModal.find(Button('Cancel'));
const cancelButtonInDeleteModal = deleteSubjectTypeModal.find(Button('Cancel'));
const deleteButtonInDeleteModal = deleteSubjectTypeModal.find(Button('Delete'));

function clickNewButton() {
  cy.do(newButton.click());
}

function enableShareCheckbox() {
  cy.do(shareCheckbox.click());
}

function clickSaveButtonInActionsColumn() {
  cy.do(saveButton.click());
}

function clickCancelInActionsColumn() {
  cy.do(cancelButton.click());
  newButton.has({ disabled: true });
  selectMembersButton.has({ disabled: true });
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

function verifySourceTypeAbsent(name) {
  cy.get('#editList-subjecttypes')
    .find('[class*="mclCell-"]:nth-child(1)')
    .each(($cell) => {
      cy.wrap($cell).invoke('text').should('not.eq', name);
    });
}

export default {
  clickNewButton,
  clickSaveButtonInActionsColumn,
  clickCancelInActionsColumn,
  enableShareCheckbox,
  fillNameField,
  getRowIndexesByUserName,
  getRowIndexesBySubjectTypeName,
  verifyColumnAndClickEdit,
  verifySourceTypeAbsent,
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Subject types');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  createNewSubjectType(name, isUnique = true) {
    clickNewButton();
    this.verifyNewRowForSubjectTypeInTheList();
    fillNameField(name);
    if (!isUnique) {
      clickSaveButtonInActionsColumn();
      cy.expect([
        TextField({ name: 'items[0].name' }).has({
          error: 'Name is already in use at one or more member libraries.',
        }),
        cancelButton.has({ disabled: false }),
        saveButton.has({ disabled: false }),
      ]);
    }
    clickSaveButtonInActionsColumn();
  },

  clickKeepEditingInConfirmModal() {
    cy.do(keepEditingButtonInConfirmModal.click());
    cy.expect(confirmMemberLibrariesModal.absent());
    this.verifyNewRowForSubjectTypeInTheList();
  },

  cancel() {
    cy.do(cancelButtonInConfirmModal.click());
    this.verifyNewRowForSubjectTypeInTheList();
  },

  confirmConfirmMemberLibraries(subjectTypeName, libraries) {
    this.verifyShareToAllModal(subjectTypeName, libraries);
    cy.do(confirmButton.click());
    cy.expect([confirmMemberLibrariesModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(
      including(
        `${subjectTypeName} was successfully created for ${libraries[0]}, ${libraries[1]}, ${libraries[2]} libraries.`,
      ),
    );
  },

  editSubjectType(name, newName, user, tenantName) {
    getRowIndexesByUserName(user).then((rowIndexes) => {
      verifyColumnAndClickEdit(rowIndexes, tenantName).then((index) => {
        this.verifyEditRowForSubjectTypeInTheList(name, user, index);
        fillNameField(newName, index);
      });
    });
    cy.expect([cancelButton.has({ disabled: false }), saveButton.has({ disabled: false })]);
    clickSaveButtonInActionsColumn();
    InteractorsTools.checkCalloutMessage(
      `${newName} was successfully updated for ${tenantName} library.`,
    );
  },

  deleteSubjectType(name, user, tenantName) {
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
      cancelButtonInDeleteModal.has({ disabled: false }),
      deleteButtonInDeleteModal.has({ disabled: false }),
    ]);
    cy.do(deleteButtonInDeleteModal.click());
    cy.expect([deleteSubjectTypeModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(`The subject type ${name} was successfully deleted.`);
  },

  verifyShareToAllModal(subjectTypeName, libraries) {
    cy.expect([
      confirmMemberLibrariesModal.exists(),
      Modal({
        content: including(`${subjectTypeName} will be saved for the member libraries:`),
      }).exists(),
      Modal({ content: including(`${libraries[0]}`) }).exists(),
      Modal({ content: including(`${libraries[1]}`) }).exists(),
      Modal({ content: including(`${libraries[2]}`) }).exists(),
      confirmMemberLibrariesModal.find(Button('Keep editing')).has({ disabled: false }),
      confirmButton.has({ disabled: false }),
    ]);
  },

  verifyNewRowForSubjectTypeInTheList() {
    cy.expect([
      newButton.has({ disabled: true }),
      selectMembersButton.has({ disabled: true }),
      TextField({ name: 'items[0].name' }).has({ placeholder: 'name', disabled: false }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'No value set-' }),
      shareCheckbox.has({ disabled: true }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: false }),
    ]);
  },

  verifyEditRowForSubjectTypeInTheList(name, user, rowIndex) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

    cy.expect([
      TextField({ name: `items[${rowIndex}].name` }).has({ value: name, disabled: false }),
      subjectTypesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex: 1 }))
        .has({ content: 'local' }),
      subjectTypesList
        .find(MultiColumnListRow({ indexRow: `row-${rowIndex}` }))
        .find(
          MultiColumnListCell({
            columnIndex: 2,
            content: including(`${date} by ${user.lastName},`),
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

  verifyCreatedSubjectTypes(subjectType, user) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

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
                content: matching(/^(Central Office|College|University)$/),
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

  verifyEditedSubjectTypes(name, editedName) {
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

  verifySubjectTypesDeleted(user) {
    getRowIndexesByUserName(user).then((rowIndexes) => {
      // verify that list contains only two subject types created by current user
      expect(rowIndexes).to.have.length(2);
    });
    cy.expect([newButton.has({ disabled: false }), selectMembersButton.has({ disabled: false })]);
  },

  verifySourceTypeExists(subjectSourceName, tenantName) {
    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: tenantName }),
        ]);
      }),
    );
  },
};
