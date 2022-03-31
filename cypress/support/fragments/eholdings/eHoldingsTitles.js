import { Button, ListItem, Section, PaneHeader } from '../../../../interactors';
import eHoldingsTitle from './eHoldingsTitle';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomTitle from './eHoldingsNewCustomTitle';

const resultSection = Section({ id: 'search-results' });

export default {

  waitLoading: () => {
    cy.expect(resultSection.find(PaneHeader('Loading...')).absent());
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
  create: (packageName, titleName = `title_${getRandomPostfix()}`) => {
    cy.do(resultSection.find(Button('New')).click());
    eHoldingsNewCustomTitle.waitLoading();
    eHoldingsNewCustomTitle.fillInRequiredProperties(packageName, titleName);
    eHoldingsNewCustomTitle.saveAndClose();
    return titleName;
  },
  getSelectedNotCustomTitleViaApi:(subject) => {
    cy.okapiRequest({ path: 'eholdings/titles',
      searchParams: { 'filter[selected]':true, searchfield:subject, 'filter[subject]': subject, 'filter[custom]': false },
      isDefaultSearchParamsRequired : false }).then(({ body }) => {
      const initialTitles = body.data.filter(specialTitle => specialTitle?.attributes?.name)
        .map(title => ({ id: title.id, name: title.attributes.name }));
      cy.wrap([...new Set(initialTitles)][0]).as('title');
    });
    return cy.get('@title');
  }
};
