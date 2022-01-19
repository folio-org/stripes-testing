import { Accordion, Button, MultiColumnListCell, Selection, TextField } from '../../../../interactors';

const waitUntilSearchJobProfile = (jobProfileName) => {
  cy.expect(MultiColumnListCell(jobProfileName).exists());
};

export default {
  checkImportFile:(fileName) => {
    cy.do(Button('View all').click());
    cy.expect(TextField({ id:'input-job-logs-search' }).exists());
    cy.do(TextField({ id: 'input-job-logs-search' }).fillIn('oneMarcBib.mrc'));
    cy.wait(10000);
    cy.do(Button('Search').click());
    cy.expect(Accordion({ id: 'profileIdAny' }).find(Button({ id: 'accordion-toggle-button-profileIdAny' })).exists());
    cy.do(Accordion({ id: 'profileIdAny' }).find(Button({ id: 'accordion-toggle-button-profileIdAny' })).click());
    // when the file is first imported, information is displayed for a very long time due to the architectural decision
    cy.wait(20000);
    cy.expect(Accordion({ id: 'profileIdAny' }).find(Selection()).exists());
    cy.do(Accordion({ id: 'profileIdAny' }).find(Selection()).choose(fileName));
    waitUntilSearchJobProfile(fileName);
  },

  checkStatusOfJobProfile:() => {
    cy.do(MultiColumnListCell({ row: 0, column: 'Completed' }).exists());
  },

  openJobProfile:() => {
    cy.wait(20000);
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button('oneMarcBib.mrc')).click());
  },
};
