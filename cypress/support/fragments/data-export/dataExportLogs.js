import { MultiColumnListCell, Button, Pane, Modal, including } from '../../../../interactors';

const jobsPane = Pane('Jobs');
const logsPane = Pane('Logs');
const areYouSureModal = Modal('Are you sure you want to run this job?');

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

  clickFileNameFromTheList(fileName) {
    cy.do(MultiColumnListCell({ content: including(fileName) }).click());
  },

  saveMarcFileForImport: () => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button()).click());
  },

  verifyAreYouSureModalAbsent() {
    cy.expect(areYouSureModal.absent());
  },

  verifyErrorTextInErrorLogsPane(errorText) {
    cy.get('[class^=errorLogsContainer]').contains(errorText);
  },
};
