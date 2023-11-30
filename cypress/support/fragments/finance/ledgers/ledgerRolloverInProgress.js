import { Button, Progress, Section } from '../../../../../interactors';

const ledgerRolloverInProgressSection = Section({ id: 'pane-ledger-rollover-in-progress' });
const progressBar = ledgerRolloverInProgressSection.find(Progress({ testId: 'progress-bar' }));

const closeAndViewLedgerButton = ledgerRolloverInProgressSection.find(
  Button('Close & view ledger details'),
);

export default {
  waitLoading() {
    cy.expect(ledgerRolloverInProgressSection.exists());
  },
  checkLedgerRolloverInProgressDetails({ status = 'complete' } = {}) {
    cy.expect(progressBar.has({ content: `Rollover is ${status}` }));
    cy.expect(closeAndViewLedgerButton.exists());
  },
  clickCloseAndViewLedgerButton() {
    cy.expect(closeAndViewLedgerButton.has({ disabled: false }));
    cy.do(closeAndViewLedgerButton.click());

    cy.wait(2000);
  },
};
