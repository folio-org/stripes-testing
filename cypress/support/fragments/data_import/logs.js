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
    // TODO delete wait after fix by developers
    cy.wait(20000);
    cy.do(Button('Search').click());
    cy.wait(20000);
    cy.expect(Accordion({ id: 'jobProfileInfo' }).find(Button({ id: 'accordion-toggle-button-jobProfileInfo' })).exists());
    cy.do(Accordion({ id: 'jobProfileInfo' }).find(Button({ id: 'accordion-toggle-button-jobProfileInfo' })).click());
    cy.expect(Accordion({ id: 'jobProfileInfo' }).find(Selection()).exists());
    cy.do(Accordion({ id: 'jobProfileInfo' }).find(Selection()).choose(fileName));
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
