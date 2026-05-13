import { Card, Section } from '../../../../interactors';

export default {
  selectVersionHistoryCard(date) {
    cy.do(
      Section({ id: 'versions-history-pane-organization' })
        .find(Card({ headerStart: date }))
        .perform((el) => {
          const btn = el.querySelector('button[icon="clock"]');
          if (btn && !btn.disabled) {
            btn.click();
          }
        }),
    );
  },

  selectVersionHistoryCardByIndex(index) {
    cy.do(
      Section({ id: 'versions-history-pane-organization' })
        .find(Card({ index }))
        .perform((el) => {
          const btn = el.querySelector('button[icon="clock"]');
          if (btn && !btn.disabled) {
            btn.click();
          }
        }),
    );
  },
};
