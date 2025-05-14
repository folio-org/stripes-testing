import { including } from '@interactors/html';
import { Button, HTML, Pane, PaneHeader } from '../../../../interactors';

const rootSection = Pane({ title: 'Version history' });
const paneHeader = rootSection.find(PaneHeader());
const closeButton = Button({ icon: 'times' });

export default {
  waitLoading() {
    cy.expect(rootSection.exists());
  },

  verifyListOfChanges(listOfChanges) {
    listOfChanges.forEach((item) => {
      cy.expect(rootSection.has({ text: including(item) }));
    });
  },

  verifyChangesAbsent(changes) {
    changes.forEach((change) => {
      cy.expect(rootSection.find(HTML({ text: including(change) })).absent());
    });
  },

  verifyVersionsCount(count) {
    cy.expect(paneHeader.has({ text: including(`${count} version`) }));
  },

  clickCloseButton() {
    cy.do(rootSection.find(closeButton).click());
    cy.expect(rootSection.absent());
  },
};
