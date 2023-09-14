/// <reference types="cypress" />

import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import TopMenu from '../../../support/fragments/topMenu';
import { Pane, Section, Button } from '../../../../interactors';
import { DevTeams, TestTypes, Permissions, Features } from '../../../support/dictionary';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingResourceEdit';
import DateTools from '../../../support/utils/dateTools';
import Users from '../../../support/fragments/users/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('eHoldings', () => {
  describe('Title+Package', () => {
    let userId;

    it(
      'C16994 Add a title in a package to holdings (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToTitles();
          EHoldingsTitlesSearch.bySubject('chemical engineering');
          EHoldingsTitlesSearch.byPublicationType('Journal');
          EHoldingsTitlesSearch.bySelectionStatus(EHoldingsTitle.filterStatuses.notSelected);
          EHoldingsTitles.openTitle(1);
          EHoldingsTitle.waitPackagesLoading();
          EHoldingsTitle.filterPackages();
          EHoldingsTitle.waitPackagesLoading();
          EHoldingsTitle.checkPackagesSelectionStatus(EHoldingsTitle.filterStatuses.notSelected);
          EHoldingsTitle.openResource();
          EHoldingsResourceView.addToHoldings();
          EHoldingsResourceView.checkHoldingStatus(EHoldingsTitle.filterStatuses.selected);
          cy.then(() => Pane().id()).then((resourceId) => {
            cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
            cy.expect(Button('Edit').exists());
            cy.expect(Button('Remove title from holdings').exists());
          });
        });
      },
    );

    it(
      'C700 Title: Add or Edit custom coverage (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToTitles();

          // test related with special data from Ebsco
          const selectedResource = {
            title:
              'Preparative biochemistry & biotechnology : an international journal for rapid communications',
            publicationType: 'Journal',
            package: 'Taylor & Francis',
          };
          EHoldingsTitlesSearch.byTitle(selectedResource.title);
          EHoldingsTitlesSearch.byPublicationType(selectedResource.publicationType);
          EHoldingsTitlesSearch.bySelectionStatus(EHoldingsTitle.filterStatuses.selected);
          EHoldingsTitles.openTitle(0);
          EHoldingsTitle.waitPackagesLoading();
          EHoldingsTitle.filterPackages(
            EHoldingsPackage.filterStatuses.selected,
            selectedResource.package,
          );
          EHoldingsTitle.waitPackagesLoading();
          EHoldingsTitle.openResource();
          EHoldingsResourceView.goToEdit();
          EHoldingsResourceEdit.swicthToCustomCoverageDates();

          let addedRangesCount = 0;
          const dateRanges = DateTools.getDateRanges(2).map((range) => ({
            startDay: `${DateTools.padWithZero(
              range.startDay.getMonth() + 1,
            )}/${DateTools.padWithZero(range.startDay.getDate())}/${DateTools.padWithZero(
              range.startDay.getFullYear(),
            )}`,
            endDay: `${DateTools.padWithZero(range.endDay.getMonth() + 1)}/${DateTools.padWithZero(
              range.endDay.getDate(),
            )}/${DateTools.padWithZero(range.endDay.getFullYear())}`,
          }));
          dateRanges.forEach((range) => {
            EHoldingsResourceEdit.setCustomCoverageDates(range, addedRangesCount);
            addedRangesCount++;
          });
          EHoldingsResourceEdit.saveAndClose();
          EHoldingsResourceView.waitLoading();
          EHoldingsResourceView.checkCustomPeriods(dateRanges);

          // revert test data
          // TODO: redesign to api requests
          EHoldingsResourceView.goToEdit();
          EHoldingsResourceEdit.removeExistingCustomeCoverageDates();
        });
      },
    );

    it(
      'C691 Remove a title in a package from your holdings (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;

          EHoldingsTitles.getSelectedNotCustomTitleViaApi('test').then((specialTitle) => {
            cy.login(userProperties.username, userProperties.password, {
              path: `${TopMenu.eholdingsPath}/titles/${specialTitle.id}`,
              waiter: () => EHoldingsTitle.waitLoading(specialTitle.name),
            });
            EHoldingsTitle.waitPackagesLoading();
            EHoldingsTitle.filterPackages(EHoldingsPackage.filterStatuses.selected);
            EHoldingsTitle.waitPackagesLoading();
            EHoldingsTitle.checkPackagesSelectionStatus(EHoldingsPackage.filterStatuses.selected);
            EHoldingsTitle.openResource();
            EHoldingsResourceView.checkHoldingStatus(EHoldingsTitle.filterStatuses.selected);
            EHoldingsResourceView.removeTitleFromHolding();
            EHoldingsResourceView.checkHoldingStatus(EHoldingsTitle.filterStatuses.notSelected);
          });
        });
      },
    );

    it(
      'C693 Create a custom title. (spitfire)',
      { tags: [TestTypes.smoke, DevTeams.spitfire, Features.eHoldings] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.getCustomPackageViaApi().then((packageName) => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });
            EHoldingSearch.switchToTitles();
            const title = EHoldingsTitles.create(packageName);
            EHoldingsResourceView.checkNames(packageName, title);
          });
        });
      },
    );

    afterEach(() => {
      Users.deleteViaApi(userId);
    });
  });
});
