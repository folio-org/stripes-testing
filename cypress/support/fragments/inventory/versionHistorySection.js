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
    cy.expect(
      paneHeader.has({ text: including(`${count} ${count === 1 ? 'version' : 'versions'}`) }),
    );
  },

  getVersionHistoryValue() {
    this.waitLoading();
    return cy
      .get('[data-test-pane-header-sub="true"] span')
      .invoke('text')
      .then((text) => {
        const match = text.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      });
  },

  clickCloseButton() {
    cy.do(rootSection.find(closeButton).click());
    cy.expect(rootSection.absent());
  },
};
