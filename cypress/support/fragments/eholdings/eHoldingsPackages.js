import { Button, HTML, ListItem, Section, including, or } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import topMenu from '../topMenu';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';
// eslint-disable-next-line import/no-cycle
import eHoldingsPackage from './eHoldingsPackage';
import eHoldingsPackagesSearch from './eHoldingsPackagesSearch';
import eHoldingsProvidersSearch from './eHoldingsProvidersSearch';
import eHoldingsSearch from './eHoldingsSearch';

const resultSection = Section({ id: 'search-results' });

export default {
  create: (packageName = `package_${getRandomPostfix()}`) => {
    cy.do(Button('New').click());
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    return packageName;
  },

  waitLoading: () => {
    cy.expect(or(
      resultSection.find(ListItem({ className: including('list-item-'), index: 1 }).find(Button())).exists(),
      resultSection.find(HTML(including('Enter a query to show search results.'))).exists()
    ));
  },

  openPackage: (rowNumber = 0) => {
    const specialRow = resultSection.find(ListItem({ className: including('list-item-'), index: rowNumber }));
    cy.then(() => specialRow.h3Value())
      .then(specialPackage => {
        cy.do(resultSection
          .find(ListItem({ className: including('list-item-'), index: rowNumber })
            .find(Button())).click());
        eHoldingsPackage.waitLoading(specialPackage);
        cy.wrap(specialPackage).as('selectedPackage');
      });
    return cy.get('@selectedPackage');
  },

  getPackageName: (rowNumber = 0) => {
    return cy.then(() => resultSection.find(ListItem({ className: including('list-item-'), index: rowNumber })).h3Value());
  },

  getCustomPackageViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[custom]': true, count: 10, pageSize: 10 },
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      const initialPackageNames = body.data.filter(specialPackage => specialPackage?.attributes?.isCustom)
        .map(customePackage => customePackage.attributes?.name)
        .filter(name => name);
      cy.wrap([...new Set(initialPackageNames)][0]).as('customePackageName');
    });
    return cy.get('@customePackageName');
  },

  getNotCustomSelectedPackageIdViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[selected]': true, count: 100, pageSize: 100 },
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      const initialPackageIds = body.data.filter(specialPackage => !specialPackage?.attributes?.isCustom
        && specialPackage?.attributes?.name
        // TODO: can't see not complete package in response now
        // && specialPackage.attributes?.packageType !== 'Complete'
        // TODO: potencial issue with this package
        && !['123Library eBooks'].includes(specialPackage?.attributes?.name))
        .map(customePackage => ({ id: customePackage.id, name: customePackage.attributes.name }));
      cy.wrap([...new Set(initialPackageIds)][0]).as('packageId');
    });
    return cy.get('@packageId');
  },

  getNotSelectedPackageIdViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[selected]': false, count: 100, pageSize: 100 },
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      const initialPackageIds = body.data.filter(specialPackage => !specialPackage?.attributes?.isCustom
        && specialPackage?.attributes?.name
        && specialPackage.attributes?.packageType !== 'Complete'
        // TODO: potencial issue with this package
        && !['123Library eBooks'].includes(specialPackage?.attributes?.name))
        .map(customePackage => ({ id: customePackage.id, name: customePackage.attributes.name }));
      cy.wrap([...new Set(initialPackageIds)][0]).as('packageId');
    });
    return cy.get('@packageId');
  },

  packageSearch() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('VLeBooks');
    eHoldingsPackagesSearch.bySelectionStatus('Selected');
  },
};
