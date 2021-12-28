import { Accordion, Button, MultiColumnListCell, Selection, TextField } from '../../../../interactors';

const collectionOfColumns = [MultiColumnListCell({ row: 0, columnIndex: 2 }), MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }), MultiColumnListCell({ row: 0, columnIndex: 5 })];

export default {
  checkImportFile:(fileName) => {
    cy.do(Button('View all').click());
    cy.expect(TextField({ id:'input-job-logs-search' }).exists());
    cy.do(TextField({ id: 'input-job-logs-search' }).fillIn('oneMarcBib.mrc'));
    // TODO delete after fix by developers
    cy.wait(10000);
    cy.do(Button('Search').click());
    cy.expect(Accordion({ id: 'jobProfileInfo' }).find(Button({ id: 'accordion-toggle-button-jobProfileInfo' })).exists());
    cy.do(Accordion({ id: 'jobProfileInfo' }).find(Button({ id: 'accordion-toggle-button-jobProfileInfo' })).click());
    cy.expect(Accordion({ id: 'jobProfileInfo' }).find(Selection()).exists());
    cy.do(Accordion({ id: 'jobProfileInfo' }).find(Selection()).choose(fileName));
  },

  waitUntilSearchJobProfile:(jobProfileName) => {
    cy.expect(MultiColumnListCell(jobProfileName).exists());
  },

  checkStatusOfJobProfile:() => {
    cy.do(
      MultiColumnListCell({ row: 0, columnIndex: 1 }).perform(element => {
        expect(element).to.have.text('Completed');
      })
    );
  },

  openJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button('oneMarcBib.mrc')).click());
  },

  checkCreatedItems:() => {
    collectionOfColumns.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },
};
