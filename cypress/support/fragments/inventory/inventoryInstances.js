import { HTML, including, Section, or, MultiColumnList } from '../../../../interactors';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(MultiColumnList({ id: 'list-inventory' }));

export default {
  waitLoading:() => {
    cy.expect(rootSection.find(HTML(including('Choose a filter or enter a search query to show results'))).absent());
    cy.expect(rootSection.find(HTML(including('Loading…'))).absent());
    cy.expect(or(inventoriesList.exists()),
      rootSection.find(HTML(including('No results found'))).exists());
  },
  selectSpecialInstance:(rowNumber = 0) => {
    cy.do(inventoriesList.click({ row: rowNumber }));
  }
};
