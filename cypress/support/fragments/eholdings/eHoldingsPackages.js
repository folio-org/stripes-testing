import { Button, ListItem, Section, HTML, including, or } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';
import eHoldingsPackage from './eHoldingsPackage';

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
  },
  openPackage: (rowNumber = 0) => {
    const specialRow = resultSection.find(ListItem({ index: rowNumber }));

    cy.then(() => specialRow.h3Value())
      .then(specialPackage => {
        cy.do(resultSection
          .find(ListItem({ index: rowNumber })
            .find(Button())).click());
        eHoldingsPackage.waitLoading(specialPackage);
        cy.wrap(specialPackage).as('selectedPackage');
      });
    return cy.get('@selectedPackage');
  },
  getPackageName:(rowNumber = 0) => {
    return cy.then(() => resultSection.find(ListItem({ index: rowNumber })).h3Value());
  },
  getCustomPackageViaApi:() => {
    cy.okapiRequest({ path: 'eholdings/packages',
      searchParams: { 'filter[custom]':true, count:10, pageSize:10 },
      isDefaultSearchParamsRequired : false }).then(({ body }) => {
      const initialPackageNames = body.data.filter(specialPackage => specialPackage?.attributes?.isCustom)
        .map(customePackage => customePackage.attributes?.name)
        .filter(name => name);
      cy.wrap([...new Set(initialPackageNames)][0]).as('customePackageName');
    });
    return cy.get('@customePackageName');
  }
};
