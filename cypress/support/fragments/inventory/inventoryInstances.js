import { HTML, including, Button, Section, List, or } from '../../../../interactors';

const rootSection = Section({ id: 'pane-results' });
const inventoriesList = rootSection.find(List({ id: 'list-inventory' }));
const actionsButton = rootSection.find(Button('Actions'));

export default {
  waitLoading:() => cy.expect(or(inventoriesList.exists()),
    rootSection.find(HTML(including('No results found'))).exists()),
};
