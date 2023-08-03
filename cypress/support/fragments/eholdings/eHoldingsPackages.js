import { Button, HTML, ListItem, Modal, Section, including, or } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import topMenu from '../topMenu';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';
// eslint-disable-next-line import/no-cycle
import eHoldingsPackage from './eHoldingsPackage';
import eHoldingsPackagesSearch from './eHoldingsPackagesSearch';
import eHoldingsProvidersSearch from './eHoldingsProvidersSearch';
import eHoldingsSearch from './eHoldingsSearch';

const resultSection = Section({ id: 'search-results' });
const selectedText = "#packageShowHoldingStatus div[class^='headline']";
const actionButton = Button('Actions');
const deletePackageButton = Button('Delete package');
const confirmModal = Modal('Delete custom package');
const addNewPackageButton = Button('New');

export default {
  create: (packageName = `package_${getRandomPostfix()}`) => {
    cy.do(Button('New').click());
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    return packageName;
  },

  deletePackage: () => {
    cy.do([actionButton.click(),
      deletePackageButton.click(),
      confirmModal.find(Button('Yes, delete')).click()]);
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

  checkPackageInResults(packageName, rowNumber = 0) {
    cy.expect(resultSection.find(ListItem({ className: including('list-item-'), index: rowNumber })).has({ h3Value: packageName }));
  },

  createCustomPackage(packageName) {
    cy.do(addNewPackageButton.click());
    eHoldingsNewCustomPackage.waitLoading();
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    eHoldingsNewCustomPackage.checkPackageCreatedCallout();
  },

  checkPackageExistsViaAPI(packageName, isCustom = false, timeOutSeconds = 15) {
    let timeCounter = 0;
    function checkPackage() {
      cy.okapiRequest({ path: 'eholdings/packages',
        searchParams: { 'q': packageName },
        isDefaultSearchParamsRequired : false }).then(({ body }) => {
        if (body.data[0] || timeCounter >= timeOutSeconds) {
          cy.expect(body.data[0].attributes.isCustom).equals(isCustom);
        } else {
          // wait 1 second before retrying request
          cy.wait(1000);
          checkPackage();
          timeCounter++;
        }
      });
    }
    checkPackage();
  },

  deletePackageViaAPI(packageName) {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'q': packageName },
      isDefaultSearchParamsRequired : false
    }).then(({ body }) => {
      cy.okapiRequest({
        method: 'DELETE',
        path: `eholdings/packages/${body.data[0].id}`,
        isDefaultSearchParamsRequired : false
      });
    });
  },

  updateProxy() {
    cy.get(selectedText)
      .invoke('text')
      .then((text) => {
        if (text === 'Selected') {
          eHoldingsPackage.editProxyActions();
          eHoldingsPackage.changeProxy();
          eHoldingsPackage.saveAndClose();
        } else {
          eHoldingsPackage.addToHoldings();
          eHoldingsPackage.editProxyActions();
          eHoldingsPackage.changeProxy();
          eHoldingsPackage.saveAndClose();
        }
      });
  },

  packageSearch() {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('VLeBooks');
    eHoldingsPackagesSearch.bySelectionStatus('Selected');
  },
};
