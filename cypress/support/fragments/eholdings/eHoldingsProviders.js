import { Button, ListItem, Section, including } from '../../../../interactors';
import eHoldingsProviderView from './eHoldingsProviderView';

const resultSection = Section({ id: 'search-results' });

export default {
  waitLoading: () => {
    cy.expect(resultSection
      .find(ListItem({ className: including('list-item-'), index: 1 })
        .find(Button())).exists());
  },
  viewProvider: (rowNumber = 0) => {
    cy.do(resultSection.find(ListItem({ className: including('list-item-'), index: rowNumber })).find(Button()).click());
    eHoldingsProviderView.waitLoading();
  }
};
