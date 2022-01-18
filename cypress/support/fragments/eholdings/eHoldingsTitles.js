import { Button, ListItem, Section } from '../../../../interactors';
import eHoldingsTitle from './eHoldingsTitle';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomTitle from './eHoldingsNewCustomTitle';

const resultSection = Section({ id: 'search-results' });
const defaultPackage = 'e-book';

export default {

  waitLoading: () => {
    cy.expect(resultSection
      .find(ListItem({ index: 1 })
        .find(Button())).exists());
  },
  openTitle: (rowNumber = 0) => {
    const specialRow = resultSection.find(ListItem({ index: rowNumber }));

    cy.then(() => specialRow.h3Value())
      .then(title => {
        cy.do(resultSection
          .find(ListItem({ index: rowNumber })
            .find(Button())).click());
        eHoldingsTitle.waitLoading(title);
      });
  },
  create: (packageName = defaultPackage, titleName = `title_${getRandomPostfix()}`) => {
    cy.do(resultSection.find(Button('New')).click());
    eHoldingsNewCustomTitle.waitLoading();
    eHoldingsNewCustomTitle.fillInRequiredProperties(packageName, titleName);
    eHoldingsNewCustomTitle.saveAndClose();
    return titleName;
  },
  defaultPackage
};
