import { Button, including, Section, Card } from '../../../../interactors';

const versionsHistoryOrderLineSection = Section({ id: 'versions-history-pane-order-line' });
const iconClock = Button({ icon: 'clock' });
const iconTimes = Button({ icon: 'times' });

export default {
  waitLoading() {
    cy.expect(versionsHistoryOrderLineSection.exists());
  },
  veriifyIconClockExists() {
    cy.expect(iconClock.exists());
  },
  veriifyVersionHistoryCardDate(date) {
    cy.expect([versionsHistoryOrderLineSection.find(Card({ headerStart: date }))]);
  },
  veriifyVersionHistoryCardText(text) {
    cy.expect([versionsHistoryOrderLineSection.has({ text: including(text) })]);
  },
  closeVersionHistory: () => {
    cy.do(versionsHistoryOrderLineSection.find(iconTimes).click());
  },
};
