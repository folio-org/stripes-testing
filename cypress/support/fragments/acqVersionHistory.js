import { Button, Card, including, Section } from '../../../interactors';
import { DEFAULT_WAIT_TIME } from '../constants';

const CURRENT_VERSION = 'Current version';
const ORIGINAL_VERSION = 'Original version';

export default {
  assertVersionHistoryCard(
    entityType,
    { changedFields, eventDate, index, isCurrent = false, isOriginal = false, source },
  ) {
    const card = Section({ id: `versions-history-pane-${entityType}` }).find(
      Card({ ...(Number.isInteger(index) ? { index } : { headerStart: eventDate }) }),
    );

    const contentItems = [
      eventDate,
      source,
      isCurrent && CURRENT_VERSION,
      isOriginal && ORIGINAL_VERSION,
      ...(changedFields || []),
    ].filter(Boolean);

    contentItems.forEach((item) => {
      cy.expect(card.has({ text: including(item) }));
    });
  },

  selectVersionHistoryCard(entityType, { eventDate, index }) {
    cy.do([
      Section({ id: `versions-history-pane-${entityType}` })
        .find(Card({ ...(Number.isInteger(index) ? { index } : { headerStart: eventDate }) }))
        .find(Button({ icon: 'clock' }))
        .click(),
    ]);
    cy.wait(DEFAULT_WAIT_TIME);
  },

  closeVersionHistory(entityType) {
    cy.do(
      Section({ id: `versions-history-pane-${entityType}` })
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(DEFAULT_WAIT_TIME);
  },
};
