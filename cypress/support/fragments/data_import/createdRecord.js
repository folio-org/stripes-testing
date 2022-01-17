import { MultiColumnListCell } from '../../../../interactors';

const columnsShouldContainCreated = [MultiColumnListCell({ row: 0, columnIndex: 2 }), MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }), MultiColumnListCell({ row: 0, columnIndex: 5 })];

export default {
  checkCreatedItems:() => {
    columnsShouldContainCreated.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },
};
