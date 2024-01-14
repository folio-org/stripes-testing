import { Button, HTML, Progress, Section, including } from '../../../../../interactors';

const ledgerRolloverInProgressSection = Section({ id: 'pane-ledger-rollover-in-progress' });
const progressBar = ledgerRolloverInProgressSection.find(Progress({ testId: 'progress-bar' }));
const errorMessageBanner = ledgerRolloverInProgressSection.find(
  HTML({ className: including('type-error') }),
);

const closeAndViewLedgerButton = ledgerRolloverInProgressSection.find(
  Button('Close & view ledger details'),
);

const ROLLOVER_STATUSES = {
  COMPLETE: 'Rollover is complete',
  COMPLETED_WITH_ERROR:
    'Rollover has completed with errors, Budget close Success, Order rollover Success, Financial rollover Error.',
};

export default {
  waitLoading() {
    cy.expect(ledgerRolloverInProgressSection.exists());
  },
  checkLedgerRolloverInProgressDetails({ successful = true } = {}) {
    const content = successful
      ? ROLLOVER_STATUSES.COMPLETE
      : ROLLOVER_STATUSES.COMPLETED_WITH_ERROR;

    cy.expect(progressBar.has({ content }));
    cy.expect(closeAndViewLedgerButton.exists());

    if (!successful) {
      cy.expect(errorMessageBanner.exists());
    }
  },
  clickRolloverErrorLink() {
    cy.do(errorMessageBanner.find(HTML({ className: including('hoveredLink') })).click());
  },
  clickCloseAndViewLedgerButton() {
    cy.expect(closeAndViewLedgerButton.has({ disabled: false }));
    cy.do(closeAndViewLedgerButton.click());

    cy.wait(2000);
  },
};
