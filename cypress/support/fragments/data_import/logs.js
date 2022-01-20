import {
  Accordion,
  Button,
  MultiColumnListCell,
  Selection,
  SelectionList,
} from '../../../../interactors';

const createdItemsColumns = [
  MultiColumnListCell({ row: 0, columnIndex: 2 }),
  MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }),
  MultiColumnListCell({ row: 0, columnIndex: 5 })
];

const checkIsInstanceCreated = () => {
  cy.do(createdItemsColumns[1].perform(element => {
    expect(element).to.have.text('Created');
  }));
};

export default {
  checkImportFile(jobProfileName) {
    cy.do(Button('View all').click());
    cy.do([
      Accordion({ id: 'profileIdAny' }).clickHeader(),
      Selection({ value: 'Choose job profile' }).open(),
      SelectionList().select(jobProfileName)
    ]);
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: 'Completed' }).exists());
  },

  openJobProfile:(fileName) => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button(fileName)).click());
  },

  checkCreatedItems:() => {
    createdItemsColumns.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },

  checkIsInstanceCreated,
};
