import {
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  Selection,
  SelectionOption,
  including,
} from '../../../../../interactors';

const table = MultiColumnList();

export default {
  waitLoading() {
    cy.expect(Pane('Accession tables').exists());
  },
  verifyAccessionTablePane() {
    cy.expect([
      table.find(MultiColumnListHeader('Original location')).exists(),
      table.find(MultiColumnListHeader('Final location (Remote)')).exists(),
      table.find(MultiColumnListHeader('Actions')).exists(),
    ]);
  },
  checkTableContent(records = []) {
    records.forEach((record, index) => {
      cy.expect(
        table
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(record.name) }),
      );
    });
  },
  clickEditBtn(rowIndex = 0) {
    cy.do(
      table
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },
  clickCancelBtn(rowIndex = 0) {
    cy.do(
      table
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(Button('Cancel'))
        .click(),
    );
  },
  clickSaveBtn(rowIndex = 0) {
    const saveBtn = table
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
      .find(Button('Save'));

    cy.expect(saveBtn.has({ disabled: false }));
    cy.do(saveBtn.click());
  },
  checkSaveBtnDisabled(rowIndex = 0) {
    cy.do(
      table
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(Button('Save'))
        .has({ disabled: true }),
    );
  },
  selectConfiguration(configuration) {
    cy.do([Selection().open(), SelectionOption(including(configuration)).click()]);
  },
  selectFinalLocation(rowIndex, location) {
    cy.do([
      table.find(Button({ name: `items[${rowIndex}].finalLocationId` })).click(),
      SelectionOption(including(location)).click(),
    ]);
  },
  editFinalLocation({ rowIndex = 0, location = '' }) {
    this.clickEditBtn(rowIndex);
    this.checkSaveBtnDisabled(rowIndex);
    this.selectFinalLocation(rowIndex, location);
    this.clickSaveBtn(rowIndex);
  },
};
