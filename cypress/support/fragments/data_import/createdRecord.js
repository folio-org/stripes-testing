import { MultiColumnListCell, Button, Pane } from '../../../../interactors';

const columnsShouldContainCreated = [MultiColumnListCell({ row: 0, columnIndex: 2 }), MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }), MultiColumnListCell({ row: 0, columnIndex: 5 })];

// const buttonName = 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';

export default {
  checkCreatedItems:() => {
    columnsShouldContainCreated.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },

  /* getHrIdOfInstance: () => {
    cy.do((Pane({ id: 'pane-results' }).find(Button(buttonName)).click()));
  }, */




};
