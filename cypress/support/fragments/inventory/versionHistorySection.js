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
  Modal,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListCell,
} from '../../../../interactors';
import UsersCard from '../users/usersCard';

const rootSection = Pane({ title: 'Version history' });
const paneHeader = rootSection.find(PaneHeader());
const closeButton = Button({ icon: 'times' });
const loadMoreButton = Button('Load more');
const fieldActions = {
  ADDED: 'Added',
  REMOVED: 'Removed',
  EDITED: 'Edited',
};
const closeModalButton = Button('Close');
const changesModalColumns = ['Action', 'Field', 'Changed from', 'Changed to'];
const changesModalHeaderDefaultRegexp = /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{1,2} (AM|PM).*/;
const changesModal = Modal(matching(changesModalHeaderDefaultRegexp));

export default {
  fieldActions,
  waitLoading() {
    this.checkPaneShown();
  },

  checkPaneShown(isShown = true) {
    if (isShown) cy.expect(rootSection.exists());
    else cy.expect(rootSection.absent());
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

  getCardTimestamp(index = 0) {
    return cy.get('[class*="card"]').eq(index).find('[class*="headerStart"]').invoke('text');
  },

  getTimestampFromOpenModalChanges() {
    return cy.get('[class*="modal"]').find('[class*="headline"]').invoke('text');
  },

  verifyTimestampFormat(timestamp) {
    expect(timestamp).to.match(changesModalHeaderDefaultRegexp);
  },

  verifyVersionHistoryPane(versionsCount = 1, loadMore = false) {
    this.waitLoading();
    cy.expect(rootSection.find(closeButton).exists());
    this.verifyVersionsCount(versionsCount);
    cy.expect([
      rootSection.find(Card({ index: versionsCount - 1 })).exists(),
      rootSection.find(Card({ index: versionsCount })).absent(),
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
    let source = '';
    if (!date) dateTime = /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{1,2} (AM|PM)/;
    else dateTime = new RegExp(`${date.replace('/', '\\/')}, \\d{1,2}:\\d{1,2} (AM|PM)`);
    if (lastName && firstName) source = `Source: ${lastName}, ${firstName}`;
    const targetCard = rootSection.find(Card({ index }));
    cy.expect([
      targetCard.has({ headerStart: matching(dateTime) }),
      targetCard.has({ text: including(source) }),
    ]);
    if (isOriginal) {
      cy.expect(targetCard.has({ innerHTML: including('<b><i>Original version</i></b>') }));
    } else {
      cy.expect(targetCard.find(Button('Changed')).exists());
      if (isCurrent) {
        cy.expect(targetCard.has({ innerHTML: including('<b><i>Current version</i></b>') }));
      }
    }
  },

  verifyVersionHistoryCardWithTime(
    index = 0,
    date, // уже "9/11/2025, 5:34 PM"
    firstName,
    lastName,
    isOriginal = true,
    isCurrent = false,
  ) {
    let dateTime;

    if (!date) {
      // нет параметра — универсальный формат
      dateTime = /\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (AM|PM)/;
    } else {
      // мы заранее подготовили строку через replace(' ', ', ')
      const escaped = date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      dateTime = new RegExp(`^${escaped}$`);
    }

    const source = lastName && firstName ? `Source: ${lastName}, ${firstName}` : '';
    const targetCard = rootSection.find(Card({ index }));

    cy.expect([
      targetCard.has({ headerStart: matching(dateTime) }),
      targetCard.has({ text: including(source) }),
    ]);

    if (isOriginal) {
      cy.expect(targetCard.has({ text: including('Original version') }));
    } else {
      cy.expect(targetCard.has({ text: including('Changed') }));
      if (isCurrent) {
        cy.expect(targetCard.has({ text: including('Current version') }));
      }
    }
  },

  checkChangeForCard(index, changeText, action, isShown = true) {
    const targetCard = rootSection.find(Card({ index }));
    const bullet = `${changeText} (${action})`;
    if (isShown) cy.expect(targetCard.find(ListItem({ text: bullet })).exists());
    else cy.expect(targetCard.find(ListItem({ text: bullet })).absent());
  },

  checkChangeByTag(tag, action, isShown = true) {
    const bullet = `Field ${tag} (${action})`;
    if (isShown) cy.expect(rootSection.find(ListItem({ text: bullet })).exists());
    else cy.expect(rootSection.find(ListItem({ text: bullet })).absent());
  },

  checkChangesCountForCard(index, changesCount) {
    const targetCard = rootSection.find(Card({ index }));
    cy.expect(targetCard.find(List()).has({ count: changesCount }));
  },

  openChangesForCard(index = 0) {
    const targetCard = rootSection.find(Card({ index }));
    cy.do(targetCard.find(Button('Changed')).click());
    cy.expect(Modal().exists());
  },

  verifyChangesModal(date, firstName, lastName) {
    let headerRegexp;
    let source = '';
    if (!date) headerRegexp = changesModalHeaderDefaultRegexp;
    else headerRegexp = new RegExp(`${date.replace('/', '\\/')}, \\d{1,2}:\\d{1,2} (AM|PM).*`);
    if (lastName && firstName) source = `Source: ${lastName}, ${firstName}`;
    const targetModal = Modal(matching(headerRegexp));
    cy.expect([
      targetModal.exists(),
      targetModal.has({ header: including(source) }),
      targetModal.find(closeButton).exists(),
      targetModal.find(closeModalButton).exists(),
      targetModal.find(MultiColumnList({ columns: changesModalColumns })).exists(),
    ]);
  },

  checkChangeInModal(action, field, from = 'No value set-', to = 'No value set-', isShown = true) {
    const content = [action, field, from, to].join('');
    const targetModal = Modal(matching(changesModalHeaderDefaultRegexp));
    if (from instanceof RegExp && to instanceof RegExp) {
      cy.expect([
        targetModal.find(MultiColumnListRow({ content: including(`${action}${field}`) })).exists(),
        targetModal.find(MultiColumnListCell({ content: matching(from), columnIndex: 2 })).exists(),
        targetModal.find(MultiColumnListCell({ content: matching(to), columnIndex: 3 })).exists(),
      ]);
    } else if (isShown) cy.expect(targetModal.find(MultiColumnListRow({ content })).exists());
    else cy.expect(targetModal.find(MultiColumnListRow({ content })).absent());
  },

  checkChangeInModalWithIndicators(action, field, indicators, fromContent, toContent) {
    const joinedIndicators = indicators.join('');

    let indicatorDisplay;
    if (joinedIndicators === '\\\\') {
      indicatorDisplay = '   ';
    } else if (!Number.isNaN(Number(joinedIndicators))) {
      indicatorDisplay = joinedIndicators + ' ';
    } else if (/^(\d)\\$/.test(joinedIndicators)) {
      const number = joinedIndicators[0];
      indicatorDisplay = number + '  ';
    } else if (/^\\(\d)$/.test(joinedIndicators)) {
      const number = joinedIndicators[1];
      indicatorDisplay = ' ' + number + ' ';
    } else {
      indicatorDisplay = undefined;
    }

    const fromFull = indicatorDisplay + fromContent;
    const toFull = indicatorDisplay + toContent;
    const content = [action, field, fromFull, toFull].join('');

    cy.expect(changesModal.find(MultiColumnListRow({ content })).exists());
  },

  checkChangesCountInModal(changesCount) {
    const targetModal = Modal(matching(changesModalHeaderDefaultRegexp));
    cy.expect(targetModal.find(MultiColumnList()).has({ rowCount: changesCount }));
  },

  closeChangesModal(withIcon = false) {
    const targetModal = Modal(matching(changesModalHeaderDefaultRegexp));
    if (withIcon) cy.do(targetModal.find(closeButton).click());
    else cy.do(targetModal.find(closeModalButton).click());
    cy.expect(targetModal.absent());
  },

  verifyModalScrollbar() {
    cy.expect(changesModal.exists());
    cy.get('[class*="modalContent-"]').then(($modalContent) => {
      const hasScrollbar = $modalContent[0].scrollHeight > $modalContent[0].clientHeight;
      cy.expect(hasScrollbar).to.eq(true);
    });
  },

  clickOnSourceLinkInCard(index = 0) {
    const targetCard = rootSection.find(Card({ index }));
    cy.do(targetCard.find(Link({ href: including('/users/preview/') })).click());
    UsersCard.waitLoading();
  },
};
