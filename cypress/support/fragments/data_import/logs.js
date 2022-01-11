import { Accordion, Button, MultiColumnListCell, Selection, TextField } from '../../../../interactors';

const columnsShouldContainCreated = [MultiColumnListCell({ row: 0, columnIndex: 2 }), MultiColumnListCell({ row: 0, columnIndex: 3 }),
  MultiColumnListCell({ row: 0, columnIndex: 4 }), MultiColumnListCell({ row: 0, columnIndex: 5 })];

const waitUntilSearchJobProfile = (jobProfileName) => {
  cy.expect(MultiColumnListCell(jobProfileName).exists());
};

export default {
  checkImportFile:(fileName) => {
    cy.do(Button('View all').click());
    cy.expect(TextField({ id:'input-job-logs-search' }).exists());
    cy.do(TextField({ id: 'input-job-logs-search' }).fillIn('oneMarcBib.mrc'));
    cy.do(Button('Search').click());
    cy.expect(Accordion({ id: 'profileIdAny' }).find(Button({ id: 'accordion-toggle-button-profileIdAny' })).exists());
    cy.do(Accordion({ id: 'profileIdAny' }).find(Button({ id: 'accordion-toggle-button-profileIdAny' })).click());
    cy.expect(Accordion({ id: 'profileIdAny' }).find(Selection()).exists());
    cy.do(Accordion({ id: 'profileIdAny' }).find(Selection()).choose(fileName));
    waitUntilSearchJobProfile(fileName);
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: 'Completed' }).exists());
  },

  openJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button('oneMarcBib.mrc')).click());
  },

  checkCreatedItems:() => {
    columnsShouldContainCreated.forEach(column => {
      cy.do(column.perform(element => {
        expect(element).to.have.text('Created');
      }));
    });
  },
};
