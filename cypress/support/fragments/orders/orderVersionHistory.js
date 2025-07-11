import { Button, including, Section, Card } from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';

const versionsHistoryOrderLineSection = Section({ id: 'versions-history-pane-order-line' });
const iconClock = Button({ icon: 'clock' });
const iconTimes = Button({ icon: 'times' });

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
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
