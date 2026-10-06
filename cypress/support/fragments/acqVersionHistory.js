import { Button, Card, including, not, PaneHeader, Section } from '../../../interactors';
import { DEFAULT_WAIT_TIME } from '../constants';

const CURRENT_VERSION = 'Current version';
const ORIGINAL_VERSION = 'Original version';
const CHANGED = 'Changed';
const SHOW_ALL = 'Show all';

export default {
  assertVersionHistoryCard(
    entityType,
    {
      changedFields,
      eventDate,
      index,
      isCurrent = false,
      isOriginal = false,
      isChangedListAbsent = false,
      source,
    },
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

    if (isChangedListAbsent) {
      cy.expect(card.has({ text: not(including(CHANGED)) }));
    }
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

  checkVersionHistoryCardIsActive(entityType, { index, isActive = true }) {
    cy.expect(
      Section({ id: `versions-history-pane-${entityType}` })
        .find(Card({ index }))
        .find(Button({ icon: 'clock', disabled: isActive }))
        .exists(),
    );
  },

  clickVersionHistoryCardTitle(entityType, { index }) {
    cy.get(`#versions-history-pane-${entityType} [class^=card-]`)
      .eq(index)
      .find('[data-testid="version-card-title-button"]')
      .click();
    cy.wait(DEFAULT_WAIT_TIME);
  },

  checkShowAllButtonInCard(entityType, { index, label = SHOW_ALL, isPresent = true }) {
    const button = Section({ id: `versions-history-pane-${entityType}` })
      .find(Card({ index }))
      .find(Button(label));

    cy.expect(isPresent ? button.exists() : button.absent());
  },

  clickShowAllButtonInCard(entityType, { index, label = SHOW_ALL }) {
    cy.do(
      Section({ id: `versions-history-pane-${entityType}` })
        .find(Card({ index }))
        .find(Button(label))
        .click(),
    );
  },

  checkChangedFieldsCountInCard(entityType, { index, count }) {
    cy.get(`#versions-history-pane-${entityType} [class^=card-]`)
      .eq(index)
      .find('li')
      .should('have.length', count);
  },

  verifyVersionsCount(entityType, count) {
    cy.expect(
      Section({ id: `versions-history-pane-${entityType}` })
        .find(PaneHeader())
        .has({ text: including(`${count} ${count === 1 ? 'version' : 'versions'}`) }),
    );
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
