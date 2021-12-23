import { Button, ListItem, Section } from '../../../../interactors';
import eHoldingsTitle from './eHoldingsTitle';

const resultSection = Section({ id: 'search-results' });

export default {

  waitLoading: () => {
    cy.expect(resultSection
      .find(ListItem({ index: 1 })
        .find(Button())).exists());
  },
  openTitle: (rowNumber = 1) => {
    const specialRow = resultSection.find(ListItem({ index: rowNumber }));

    cy.then(() => specialRow.h3Value())
      .then(title => {
        cy.do(resultSection
          .find(ListItem({ index: rowNumber })
            .find(Button())).click());
        eHoldingsTitle.waitLoading(title);
      });
  }
};
