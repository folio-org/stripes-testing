import {
  TextField,
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Modal,
} from '../../../../../interactors';

const fieldProtectionList = MultiColumnList({ id: 'editList-marc-field-protection' });
const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const editButton = Button({ icon: 'edit' });
const deleteButton = Button({ icon: 'trash' });

function clickNewButton() {
  cy.do(newButton.click());
  cy.expect(TextField({ placeholder: 'field' }));
}
function save() {
  cy.do(saveButton.click());
}
function fillMarcFieldProtection(fieldData, rowNumber = 0) {
  cy.do(TextField({ name: `items[${rowNumber}].field` }).fillIn(fieldData.protectedField));
  if (fieldData.in1) {
    cy.get(`input[name="items[${rowNumber}].indicator1"]`).clear().type(fieldData.in1);
  }
  if (fieldData.in2) {
    cy.get(`input[name="items[${rowNumber}].indicator2"]`).clear().type(fieldData.in2);
  }
  if (fieldData.subfield) {
    cy.get(`input[name="items[${rowNumber}].subfield"]`).clear().type(fieldData.subfield);
  }
  if (fieldData.data) {
    cy.get(`input[name="items[${rowNumber}].data"]`).clear().type(fieldData.data);
  }
}
function getMultiColumnListCellsValues() {
  const cells = [];
  // get MultiColumnList rows and loop over
  return cy
    .get('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}
function validateNumsAscendingOrder(prev) {
  const itemsClone = [...prev];
  itemsClone.sort((a, b) => a - b);
  cy.expect(itemsClone).to.deep.equal(prev);
}
function isSaveButtonDisabled(isDisabled) {
  cy.expect(saveButton.has({ disabled: isDisabled }));
  cy.wait(2000);
}

export default {
  // actions
  isSaveButtonDisabled,
  clickNewButton,
  fillMarcFieldProtection,
  save,
  edit: (editedField, dataForEdit) => {
    cy.do(
      fieldProtectionList.find(MultiColumnListCell({ content: editedField })).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(
          MultiColumnListRow({ rowIndexInParent: rowNumber })
            .find(MultiColumnListCell({ columnIndex: 6 }))
            .find(editButton)
            .click(),
        );
        isSaveButtonDisabled(true);
        fillMarcFieldProtection(dataForEdit, Number(rowNumber.slice(4)));
      }),
    );
    isSaveButtonDisabled(false);
  },
  delete: (deletedField) => {
    cy.do(
      fieldProtectionList
        .find(MultiColumnListCell({ content: deletedField }))
        .perform((element) => {
          const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

          cy.do(
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ columnIndex: 6 }))
              .find(deleteButton)
              .click(),
          );
        }),
    );
  },
  confirmDelete: () => {
    cy.do(Modal('Delete MARC field protection').find(Button('Delete')).click());
  },
  cancelDelete: () => {
    cy.do(Modal('Delete MARC field protection').find(Button('Cancel')).click());
  },
  cancel: () => {
    cy.wait(1000);
    cy.do(cancelButton.click());
    cy.wait(1000);
  },
  create: (fieldData) => {
    clickNewButton();
    fillMarcFieldProtection(fieldData);
    save();
  },
  createViaApi: (fieldBody) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'field-protection-settings/marc',
        body: fieldBody,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body;
      });
  },
  deleteViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `field-protection-settings/marc/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  getListViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'field-protection-settings/marc',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.marcFieldProtectionSettings;
      });
  },

  // checks
  verifyListOfExistingSettingsIsDisplayed: () => cy.expect(fieldProtectionList.exists()),
  verifyFieldProtectionIsCreated: (data) => cy.expect(fieldProtectionList.find(MultiColumnListCell({ content: data })).exists()),
  verifyNewButtonAbsent: () => cy.expect(Pane({ id: 'controlled-vocab-pane' }).find(newButton).absent()),
  verifyNewRow(rowNumber = 0) {
    cy.expect([
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(TextField({ name: 'items[0].field' }))
        .has({ value: '' }),
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(TextField({ name: 'items[0].indicator1' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(TextField({ name: 'items[0].indicator2' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(TextField({ name: 'items[0].subfield' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(TextField({ name: 'items[0].data' }))
        .has({ value: '*' }),
      MultiColumnListRow({ rowIndexInParent: `row-${rowNumber}` })
        .find(MultiColumnListCell({ content: 'User' }))
        .exists(),
    ]);
  },
  verifySettingIsPresent(data) {
    cy.do(
      fieldProtectionList
        .find(MultiColumnListCell({ content: data.protectedField }))
        .perform((element) => {
          const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

          cy.expect([
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.protectedField }))
              .exists(),
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.in1 }))
              .exists(),
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.in2 }))
              .exists(),
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.subfield }))
              .exists(),
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.data }))
              .exists(),
            MultiColumnListRow({ rowIndexInParent: rowNumber })
              .find(MultiColumnListCell({ content: data.source }))
              .exists(),
          ]);
        }),
    );
  },
  verifySettingsSortingOrder() {
    getMultiColumnListCellsValues().then((cells) => {
      validateNumsAscendingOrder(cells);
    });
  },

  verifyErrorMessageIsPresented() {
    cy.expect(
      TextField({ name: 'items[0].field' }).has({ error: 'Please enter * or other numeric value' }),
    );
  },
  isEditButtonAbsent() {
    cy.expect(editButton.absent);
  },
  verifySettingIsAbsent(field) {
    cy.expect(fieldProtectionList.find(MultiColumnListCell({ content: field })).absent());
  },
};
