import {
  Button,
  HTML,
  List,
  ListItem,
  Modal,
  Section,
  including,
  or,
  TextField,
  KeyValue,
  Select,
  Pane,
  Link,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';
import eHoldingsPackage from './eHoldingsPackage';

const resultSection = Section({ id: 'search-results' });
const selectedText = "#packageShowHoldingStatus div[class^='headline']";
const actionButton = Button('Actions');
const deletePackageButton = Button('Delete package');
const confirmModal = Modal('Delete custom package');
const addNewPackageButton = Button('New');
const searchButton = Button('Search');
const packageList = Section({ id: 'packageShowTitles' });
const searchIcon = Button({ icon: 'search' });
const searchField = TextField({ id: 'eholdings-search' });
const chooseParameterField = Select('Select a field to search');
const subjectKeyValue = KeyValue('Subjects');
const availableProxies = ['chalmers', 'ezproxY-T', 'Inherited - None', 'MJProxy'];
const proxySelect = Select('Proxy');

const defaultPackage = {
  data: {
    type: 'packages',
    attributes: { name: `autotestEHoldingsPackage_${getRandomPostfix()}`, contentType: 'E-Book' },
  },
};

const getdefaultPackage = () => {
  return defaultPackage;
};

export default {
  defaultPackage,
  getdefaultPackage,
  create: (packageName = `package_${getRandomPostfix()}`) => {
    cy.do(Button('New').click());
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    return packageName;
  },

  deletePackage: () => {
    cy.do([
      actionButton.click(),
      deletePackageButton.click(),
      confirmModal.find(Button('Yes, delete')).click(),
    ]);
  },

  waitLoading: () => {
    cy.expect(
      or(
        resultSection
          .find(ListItem({ className: including('list-item-'), index: 1 }).find(Button()))
          .exists(),
        resultSection.find(HTML(including('Enter a query to show search results.'))).exists(),
      ),
    );
  },

  verifyListOfExistingPackagesIsDisplayed: () => {
    cy.expect(resultSection.find(List()).exists());
  },

  openPackageWithExpectedTitels: (totalTitlesNumber) => {
    cy.do(
      resultSection
        .find(ListItem({ text: including(`Total titles: ${totalTitlesNumber}`) }))
        .find(Link())
        .click(),
    );
  },

  openPackage: (rowNumber = 0) => {
    const specialRow = resultSection.find(
      ListItem({ className: including('list-item-'), index: rowNumber }),
    );
    cy.then(() => specialRow.h3Value()).then((specialPackage) => {
      cy.do(
        resultSection
          .find(ListItem({ className: including('list-item-'), index: rowNumber }).find(Button()))
          .click(),
      );
      cy.wrap(specialPackage).as('selectedPackage');
    });
    return cy.get('@selectedPackage');
  },

  getCustomPackageViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[custom]': true, count: 10, pageSize: 10 },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      const initialPackageNames = body.data
        .filter((specialPackage) => specialPackage?.attributes?.isCustom)
        .map((customePackage) => customePackage.attributes?.name)
        .filter((name) => name);
      cy.wrap([...new Set(initialPackageNames)][0]).as('customePackageName');
    });
    return cy.get('@customePackageName');
  },

  getNotCustomSelectedPackageIdViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[selected]': true, count: 100, pageSize: 100 },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      const initialPackageIds = body.data
        .filter(
          (specialPackage) => !specialPackage?.attributes?.isCustom &&
            specialPackage?.attributes?.name &&
            // TODO: can't see not complete package in response now
            // && specialPackage.attributes?.packageType !== 'Complete'
            // TODO: potencial issue with this package
            !['123Library eBooks'].includes(specialPackage?.attributes?.name),
        )
        .map((customePackage) => ({ id: customePackage.id, name: customePackage.attributes.name }));
      cy.wrap([...new Set(initialPackageIds)][0]).as('packageId');
    });
    return cy.get('@packageId');
  },

  getNotSelectedPackageIdViaApi: () => {
    cy.okapiRequest({
      path: 'eholdings/packages',
      searchParams: { 'filter[selected]': false, count: 100, pageSize: 100 },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      const initialPackageIds = body.data
        .filter(
          (specialPackage) => !specialPackage?.attributes?.isCustom &&
            specialPackage?.attributes?.name &&
            specialPackage.attributes?.packageType !== 'Complete' &&
            // TODO: potencial issue with this package
            !['123Library eBooks'].includes(specialPackage?.attributes?.name),
        )
        .map((customePackage) => ({ id: customePackage.id, name: customePackage.attributes.name }));
      cy.wrap([...new Set(initialPackageIds)][0]).as('packageId');
    });
    return cy.get('@packageId');
  },

  verifyPackageInResults(packageName, rowNumber = 0) {
    cy.expect(
      resultSection
        .find(ListItem({ className: including('list-item-'), index: rowNumber }))
        .has({ h3Value: packageName }),
    );
  },

  verifyCustomPackage(packageName) {
    cy.do(addNewPackageButton.click());
    eHoldingsNewCustomPackage.waitLoading();
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    eHoldingsNewCustomPackage.saveAndClose();
    eHoldingsNewCustomPackage.checkPackageCreatedCallout();
  },

  verifyPackageExistsViaAPI(packageName, isCustom = false, timeOutSeconds = 15) {
    let timeCounter = 0;
    function checkPackage() {
      cy.okapiRequest({
        path: 'eholdings/packages',
        searchParams: { q: packageName },
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
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
      searchParams: { q: packageName },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      cy.okapiRequest({
        method: 'DELETE',
        path: `eholdings/packages/${body.data[0].id}`,
        isDefaultSearchParamsRequired: false,
      });
    });
  },

  createPackageViaAPI(packageBody = defaultPackage) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'eholdings/packages',
        contentTypeHeader: 'application/vnd.api+json',
        body: packageBody,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
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

  verifyOnlySelectedPackagesInResults() {
    cy.expect([
      resultSection
        .find(ListItem({ text: including(eHoldingsPackage.filterStatuses.selected) }))
        .exists(),
      resultSection
        .find(ListItem({ text: including(eHoldingsPackage.filterStatuses.notSelected) }))
        .absent(),
    ]);
  },

  clickSearchTitles: (rowNumber = 0) => {
    cy.do(
      packageList
        .find(ListItem({ className: including('list-item-'), index: rowNumber }))
        .find(Button())
        .click(),
    );
  },

  subjectsAssertion() {
    cy.expect(subjectKeyValue.exists());
  },

  titlesSearch: (searchParameter, searchValue) => {
    cy.expect(searchIcon.exists());
    // wait for titles section to be loaded
    cy.wait(2000);
    cy.do([searchIcon.click(), chooseParameterField.choose(searchParameter)]);
    cy.expect([Select({ value: searchParameter.toLowerCase() }).exists(), searchField.exists()]);
    cy.do([searchField.fillIn(searchValue), searchButton.click()]);
  },

  changePackageRecordProxy: () => {
    return cy
      .then(() => proxySelect.value())
      .then((selectedProxy) => {
        const notSelectedProxy = availableProxies.filter(
          (availableProxy) => availableProxy.toLowerCase() !== selectedProxy,
        )[0];
        cy.do(proxySelect.choose(notSelectedProxy));
        cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
        return cy.wrap(notSelectedProxy);
      });
  },

  verifyPackageRecordProxy: (proxyName) => cy.expect(KeyValue('Proxy', { value: proxyName }).exists()),

  verifyDetailsPaneAbsent: (packageName) => {
    cy.expect(Pane(including(packageName)).absent());
  },
};
