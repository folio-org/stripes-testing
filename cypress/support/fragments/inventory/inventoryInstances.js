import { HTML, including, Section, or, MultiColumnList, Button } from '../../../../interactors';
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
  add: () => {
    cy.do(actionsButton.click());
    cy.do(Button('New').click());
    NewInventoryInstance.waitLoading();
    NewInventoryInstance.fillRequiredValues();
    NewInventoryInstance.save();
  }
};
