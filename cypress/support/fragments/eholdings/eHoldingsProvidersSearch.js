import {
  Button,
  TextField,
  PaneContent,
  Accordion,
  MultiSelect,
  MultiSelectOption,
} from '../../../../interactors';

const tagsAccordion = Accordion({ id: 'accordionTagFilter' });

export default {
  byProvider(provider) {
    cy.do(TextField({ id: 'eholdings-search' }).fillIn(provider));
    cy.do(Button('Search').click());
    // waitLoading is not working fine
    // eHoldingsProviders.waitLoading();
  },

  byTags(specialTag) {
    cy.do([Button({ id: 'accordion-toggle-button-accordionTagFilter' }).click()]);
    cy.wait(5000);
    // click 2 times due to unexpected behavior in case of 1 click
    cy.get('input[type="checkbox"]').click();
    cy.get('input[type="checkbox"]').focus().click();
    cy.do(tagsAccordion.find(MultiSelect()).filter(specialTag));
    cy.do(tagsAccordion.find(MultiSelectOption(specialTag)).click());
  },

  verifyTitleSearch() {
    cy.expect(PaneContent({ id: 'search-results-content' }).exists());
  },
};
