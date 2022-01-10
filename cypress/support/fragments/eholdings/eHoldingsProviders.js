import { Button, ListItem, Section } from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';

const resultSection = Section({ id: 'search-results' });

export default {
  waitLoading: () => {
    cy.expect(resultSection
      .find(ListItem({ index: 1 })
        .find(Button())).exists());
  },
  viewProvider: (rowNumber = 0) => {
    cy.do(resultSection.find(ListItem({ index: rowNumber })).find(Button()).click());
    eHoldingsProviderView.waitLoading();
  }
};
