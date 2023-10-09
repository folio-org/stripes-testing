import { MultiColumnListCell, Button, Pane } from '../../../../interactors';

const jobsPane = Pane('Jobs');
const logsPane = Pane('Logs');

export default {
  waitLoading: () => {
    cy.expect([jobsPane.exists(), logsPane.exists()]);
  },

  clickButtonWithText: (name) => {
    // We have to manually reload the page on, since cypress waits for it, but we have a single-page application
    cy.window()
      .document()
      .then((doc) => {
        doc.addEventListener('click', () => {
          setTimeout(() => {
            doc.location.reload();
          }, 3000);
        });
        cy.get('[class^=downloadFile---]').contains(name).click();
      });
  },

  saveMarcFileForImport: () => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button()).click());
  },
};
