import { including, matching } from '@interactors/html';
import {
  Button,
  HTML,
  Pane,
  PaneHeader,
  Card,
  Link,
  List,
  ListItem,
} from '../../../../interactors';

const rootSection = Pane({ title: 'Version history' });
const paneHeader = rootSection.find(PaneHeader());
const closeButton = Button({ icon: 'times' });
const loadMoreButton = Button('Load more');
const fieldActions = {
  ADDED: 'Added',
  REMOVED: 'Removed',
  EDITED: 'Edited',
};

export default {
  fieldActions,
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

  verifyVersionHistoryPane(versionsCount = 1, loadMore = false) {
    this.waitLoading();
    cy.expect(rootSection.find(closeButton).exists());
    this.verifyVersionsCount(versionsCount);
    cy.expect([
      rootSection.find(Card({ index: versionsCount - 1 })).exists(),
      rootSection.find(Card({ index: versionsCount })).absent(),
      paneHeader.has({ focused: true }),
    ]);
    if (loadMore) cy.expect(rootSection.find(loadMoreButton).exists());
    else cy.expect(rootSection.find(loadMoreButton).absent());
  },

  verifyVersionHistoryCard(
    index = 0,
    date,
    firstName,
    lastName,
    isOriginal = true,
    isCurrent = false,
  ) {
    let dateTime;
    if (!date) dateTime = /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{1,2} (AM|PM)/;
    else dateTime = new RegExp(`${date.replace('/', '\\/')}, \\d{1,2}:\\d{1,2} (AM|PM)`);
    const source = `Source: ${lastName}, ${firstName}`;
    const targetCard = rootSection.find(Card({ index }));
    cy.expect([
      targetCard.has({ headerStart: matching(dateTime) }),
      targetCard.has({ text: including(source) }),
    ]);
    if (isOriginal) {
      cy.expect(targetCard.has({ innerHTML: including('<b><i>Original version</i></b>') }));
    } else {
      cy.expect(targetCard.find(Link('Changed')).exists());
      if (isCurrent) {
        cy.expect(targetCard.has({ innerHTML: including('<b><i>Current version</i></b>') }));
      }
    }
  },

  checkChangeForCard(index, changeText, action, isShown = true) {
    const targetCard = rootSection.find(Card({ index }));
    const bullet = `${changeText} (${action})`;
    if (isShown) cy.expect(targetCard.find(ListItem({ text: bullet })).exists());
    else cy.expect(targetCard.find(ListItem({ text: bullet })).absent());
  },

  checkChangesCountForCard(index, changesCount) {
    const targetCard = rootSection.find(Card({ index }));
    cy.expect(targetCard.find(List().has({ count: changesCount })));
  },
};
