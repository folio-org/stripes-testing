import { Button, ListItem, Section, HTML, including, or } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';

const resultSection = Section({ id: 'search-results' });

export default {
  create:(packageName = `package_${getRandomPostfix()}`) => {
    cy.do(Button('New').click());
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    return packageName;
  },
  waitLoading: () => {
    cy.expect(or(
      resultSection.find(ListItem({ index: 1 }).find(Button())).exists(),
      resultSection.find(HTML(including('Enter a query to show search results.'))).exists()
    ));
  }
};
