import { recurse } from 'cypress-recurse';
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
  PaneHeader,
} from '../../../../interactors';
import { FILTER_STATUSES } from './eholdingsConstants';
import getRandomPostfix from '../../utils/stringTools';
import eHoldingsNewCustomPackage from './eHoldingsNewCustomPackage';
import eHoldingsPackage from './eHoldingsPackage';

const resultSection = Section({ id: 'search-results' });
const searchResultsList = resultSection.find(List({ testId: 'scroll-view-list' }));
const selectedText = "#packageShowHoldingStatus div[class^='headline']";
const actionButton = Button('Actions');
const createNewPackageButton = Button('New');
const deletePackageButton = Button('Delete package');
const confirmModal = Modal('Delete custom package');
const addNewPackageButton = Button({ href: '/eholdings/packages/new' });

const subjectKeyValue = KeyValue('Subjects');
const proxySelect = Select('Proxy');
const customCoverageDate = KeyValue('Custom coverage dates');
const startDateInput = TextField({ id: 'begin-coverage-0' });
const endDateInput = TextField({ id: 'end-coverage-0' });

const defaultPackage = {
  data: {
    type: 'packages',
    attributes: { name: `AT_EHoldingsPackage_${getRandomPostfix()}`, contentType: 'E-Book' },
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

  createNewPackage() {
    cy.do(createNewPackageButton.click());
  },

  deletePackage: () => {
    cy.do([
      PaneHeader().find(actionButton).click(),
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
  sortPackagesByTitlesCount({ minTitlesCount = 100 } = {}) {
    cy.then(() => searchResultsList.links()).then((links) => {
      const prefix = 'data-test-eholdings-package-list-item';
      const sortedPackages = (links?.length ? [...links] : [])
        .map((link) => {
          const totalTitlesEl = link.querySelector(`[${prefix}-num-titles="true"]`);
          const nameEl = link.querySelector(`[${prefix}-name="true"]`);
          const selectedEl = link.querySelector(
            '[data-test-eholdings-provider-list-item-num-packages-selected="true"]',
          );
          const countTotalTitles = totalTitlesEl.innerText || '0';
          const countSelected = selectedEl ? selectedEl.innerText : '0';
          return {
            id: link.getAttribute('href')?.replace('/eholdings/packages/', '') || '',
            name: nameEl.innerText,
            countTotalTitles: parseFloat(countTotalTitles.replace(/,/g, '')),
            countSelected: parseFloat(countSelected.replace(/,/g, '')),
          };
        })
        .filter((item) => item && item.id && item.name)
        .filter((item) => item.countTotalTitles >= minTitlesCount)
        .sort((a, b) => a.countTotalTitles - b.countTotalTitles);

      cy.wrap(sortedPackages).as('selectedPackages');
    });

    return cy.get('@selectedPackages');
  },
  openPackageWithExpectedName(packageName) {
    cy.do(resultSection.find(Link({ text: including(`${packageName}\n`) })).click());
  },
  openPackageWithExpectedTitels: (totalTitlesNumber) => {
    cy.wait(1000);
    cy.get('#search-results')
      .contains('[class^="list-item--"]', `Total titles: ${totalTitlesNumber}`)
      .first()
      .find('a[data-test-eholdings-package-list-item="true"]')
      .click();
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
      // count: 10, pageSize: 10 parameters were removed since empty list is returned with such values
      searchParams: { 'filter[custom]': true },
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

  verifyContentType: (contentType) => {
    cy.expect(KeyValue('Content type').has({ value: contentType }));
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
            !['123Library eBooks', '19th Century Literature and Culture'].includes(
              specialPackage?.attributes?.name,
            ),
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
            !['123Library eBooks', '19th Century Literature and Culture'].includes(
              specialPackage?.attributes?.name,
            ),
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

  verifyCustomPackage(packageName, contentType = undefined, calloutMessage) {
    cy.do(addNewPackageButton.click());
    eHoldingsNewCustomPackage.waitLoading();
    eHoldingsNewCustomPackage.fillInRequiredProperties(packageName);
    if (contentType !== undefined) eHoldingsNewCustomPackage.chooseContentType(contentType);
    eHoldingsNewCustomPackage.saveAndClose();
    eHoldingsNewCustomPackage.checkPackageCreatedCallout(calloutMessage);
  },

  verifyPackageExistsViaAPI(packageName, isCustom = false, timeOutSeconds = 30) {
    return recurse(
      () => this.getPackageViaApi(packageName),
      (response) => response.body.data.length > 0,
      {
        validate: (response) => {
          cy.expect(response.body.data[0].attributes.isCustom).equals(isCustom);
        },
        timeout: timeOutSeconds * 1000,
        delay: 1000,
      },
    );
  },

  deletePackageViaAPI(packageName, allowFailure = false) {
    this.getPackageViaApi(packageName).then(({ body }) => {
      cy.okapiRequest({
        method: 'DELETE',
        path: `eholdings/packages/${body.data[0].id}`,
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: allowFailure,
      });
    });
  },

  getPackageViaApi(packageName) {
    return cy.okapiRequest({
      method: 'GET',
      path: 'eholdings/packages',
      searchParams: { q: packageName },
      isDefaultSearchParamsRequired: false,
    });
  },

  unassignPackageViaAPI(packageName) {
    this.getPackageViaApi(packageName).then(({ body: { data } }) => {
      const packageData = data[0];
      const { attributes } = packageData;
      attributes.isSelected = false;
      cy.okapiRequest({
        method: 'PUT',
        path: `eholdings/packages/${packageData.id}`,
        contentTypeHeader: 'application/vnd.api+json',
        body: {
          data: {
            id: packageData.id,
            type: packageData.type,
            attributes: {
              name: attributes.name,
              isSelected: attributes.isSelected,
              allowKbToAddTitles: false,
              contentType: attributes.contentType,
              customCoverage: {},
              visibilityData: {
                isHidden: false,
                reason: '',
              },
              isCustom: attributes.isCustom,
              proxy: {
                id: 'ezproxy',
                inherited: true,
              },
              packageToken: {},
              isFullPackage: false,
              accessTypeId: null,
            },
          },
        },
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
      .then((response) => {
        return recurse(
          () => this.getPackageViaApi(packageBody.data.attributes.name),
          (getPackageResponse) => getPackageResponse.body.data.length > 0,
          {
            timeout: 60_000,
            delay: 1_000,
          },
        ).then(() => {
          return response.body;
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

  verifyOnlySelectedPackagesInResults() {
    cy.expect([
      resultSection.find(ListItem({ text: including(FILTER_STATUSES.SELECTED) })).exists(),
      resultSection.find(ListItem({ text: including(FILTER_STATUSES.NOT_SELECTED) })).absent(),
    ]);
  },

  subjectsAssertion() {
    cy.expect(subjectKeyValue.exists());
  },

  changePackageRecordProxy: () => {
    return cy
      .then(() => proxySelect.checkedOptionText())
      .then((selectedProxy) => {
        cy.getEholdingsProxiesViaAPI().then((existingProxies) => {
          const notSelectedProxy = existingProxies.filter(
            (existingProxy) => existingProxy !== selectedProxy,
          )[0];
          cy.do(proxySelect.choose(notSelectedProxy));
          cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
          return cy.wrap(notSelectedProxy);
        });
      });
  },

  verifyPackageRecordProxy: (proxyName) => cy.expect(KeyValue('Proxy', { value: proxyName }).exists()),

  verifyDetailsPaneAbsent: (packageName) => {
    cy.expect(Pane(including(packageName)).absent());
  },

  verifyPackageNotInSearchResults: (packageName) => {
    cy.expect(resultSection.find(Link({ text: including(packageName) })).absent());
  },

  verifyCustomCoverageDates(startDate, endDate) {
    cy.expect([
      customCoverageDate.has({ value: including(startDate) }),
      customCoverageDate.has({ value: including(endDate) }),
    ]);
  },

  fillDateCoverage(startDate, endDate) {
    cy.do([startDateInput.fillIn(startDate), endDateInput.fillIn(endDate)]);
  },
};
