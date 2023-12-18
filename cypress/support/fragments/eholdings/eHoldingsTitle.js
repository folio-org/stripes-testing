import {
  Button,
  Section,
  ListItem,
  HTML,
  including,
  Pane,
  TextField,
  KeyValue,
  Link,
} from '../../../../interactors';
import FilterPackagesModal from './modals/filterPackagesModal';
import EHoldingsResourceView from './eHoldingsResourceView';
import { FILTER_STATUSES } from './eholdingsConstants';

const closeViewButton = Button({ dataTestID: 'close-details-view-button' });
const packagesSection = Section({ id: 'titleShowPackages' });
const titleSearchField = TextField({ id: 'eholdings-search' });
const titleSearchButton = Button('Search');
const titleInformationSection = Section({ id: 'titleShowTitleInformation' });

export default {
  waitLoading: (specialTitle) => {
    cy.expect(Section({ id: specialTitle.replaceAll(' ', '-').toLowerCase() }).exists());
  },

  filterPackages: (selectionStatus = FILTER_STATUSES.NOT_SELECTED, packageName) => {
    this.openFilterPackagesModal();

    if (packageName) {
      FilterPackagesModal.selectPackageName(packageName);
    }
    FilterPackagesModal.selectPackageStatus(selectionStatus);
    FilterPackagesModal.clickSearchButton();

    if (packageName) {
      cy.expect(
        packagesSection
          .find(
            ListItem({ index: 0 })
              .find(Button())
              .find(HTML(including(packageName))),
          )
          .exists(),
      );
    }
  },
  openFilterPackagesModal() {
    // Wait is needed for modal to be loaded, element expectation didn't provide stable affect at this point (button is clicking modal doesn't open sometimes).
    cy.wait(2000);
    cy.do(packagesSection.find(Button({ icon: 'search' })).click());
    FilterPackagesModal.waitLoading();
    FilterPackagesModal.verifyModalView();

    return FilterPackagesModal;
  },
  waitPackagesLoading: () => {
    cy.expect(packagesSection.find(ListItem({ index: 0 }).find(Button())).exists());
  },

  openResource: (packageNumber = 0) => {
    cy.then(() => packagesSection.find(ListItem({ index: packageNumber })).h4Value()).then(
      (packageName) => {
        cy.then(() => Pane().title()).then((titleName) => {
          cy.do(packagesSection.find(ListItem({ index: packageNumber }).find(Button())).click());
          EHoldingsResourceView.waitLoading();
          EHoldingsResourceView.checkNames(packageName, titleName);
        });
      },
    );
  },
  openPackage({ packageName, titleName }) {
    cy.do(
      packagesSection
        .find(ListItem({ h4Value: packageName }))
        .find(Link())
        .click(),
    );
    EHoldingsResourceView.waitLoading();
    EHoldingsResourceView.checkNames(packageName, titleName);

    return EHoldingsResourceView;
  },
  checkPackagesSectionContent({ packages = [] } = {}) {
    cy.expect(
      packagesSection.find(KeyValue('Records found')).has({ value: packages.length.toString() }),
    );

    packages.forEach(({ packageName }) => {
      cy.expect(packagesSection.find(ListItem({ h4Value: packageName })).exists());
    });
  },
  checkPackagesSelectionStatus: (expectedSelectionStatus) => {
    Object.values(FILTER_STATUSES)
      .filter((packageStatus) => packageStatus !== expectedSelectionStatus)
      .forEach((notExpectedStatus) => cy.expect(
        packagesSection.find(HTML(including(FILTER_STATUSES[notExpectedStatus]))).absent(),
      ));
  },

  searchTitle(title) {
    cy.do([titleSearchField.fillIn(title), titleSearchButton.click()]);
  },

  checkOnlySelectedPackagesInResults() {
    cy.expect([
      packagesSection.find(ListItem({ text: including(FILTER_STATUSES.SELECTED) })).exists(),
      packagesSection.find(ListItem({ text: including(FILTER_STATUSES.NOT_SELECTED) })).absent(),
      packagesSection.find(ListItem({ text: including(FILTER_STATUSES.ALL) })).absent(),
    ]);
  },

  checkTitleInformationField(fieldName, expectedValue) {
    cy.expect(titleInformationSection.find(KeyValue(fieldName)).has({ value: expectedValue }));
  },
  closeHoldingsTitleView() {
    cy.do(closeViewButton.click());
  },
};
