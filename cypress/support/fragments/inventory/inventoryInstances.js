import {
  HTML,
  including,
  Section,
  or,
  MultiColumnList,
  Button,
  Pane,
  TextField,
  Checkbox
} from '../../../../interactors';
import NewInventoryInstance from './newInventoryInstance';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(MultiColumnList({ id: 'list-inventory' }));
const actionsButton = rootSection.find(Button('Actions'));

export default {
  waitLoading:() => {
    cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results'))).absent());
    cy.expect(rootSection.find(HTML(including('Loading…'))).absent());
    cy.expect(or(inventoriesList.exists()),
      rootSection.find(HTML(including('No results found'))).exists());
  },
  selectInstance:(rowNumber = 0) => {
    cy.do(inventoriesList.click({ row: rowNumber }));
  },
  add: (title) => {
    cy.do(actionsButton.click());
    cy.do(Button('New').click());
    NewInventoryInstance.waitLoading();
    NewInventoryInstance.fillRequiredValues(title);
    NewInventoryInstance.save();
  },

  resetAllFilters:() => {
    cy.do(Pane('Search & filter').find(Button('Reset all')).click());
  },

  searchByTag:(tagName) => {
    cy.do(Button({ id:'accordion-toggle-button-instancesTags' }).click());
    // wait for data to be loaded
    cy.intercept('/search/instances/facets?facet=instanceTags**').as('getTags');
    cy.do(Section({ id:'instancesTags' }).find(TextField()).click());
    cy.do(Section({ id:'instancesTags' }).find(TextField()).fillIn(tagName));
    cy.wait('@getTags');
    // TODO: clarify with developers what should be waited
    cy.wait(1000);
    cy.do(Section({ id:'instancesTags' }).find(TextField()).focus());
    cy.do(Section({ id:'instancesTags' }).find(TextField()).click());
    cy.do(Checkbox(tagName).click());
  },
};
