/// <reference types="cypress" />

import { Button, Pane, Section } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import eHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import eHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import eHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import TopMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';
import dateTools from '../../../support/utils/dateTools';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('eHoldings', () => {
  describe('Title+Package', () => {
    let userId;

    it(
      'C16994 Add a title in a package to holdings (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C16994'] },
      () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.uieHoldingsRecordsEdit.gui,
          permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: eHoldingsTitlesSearch.waitLoading,
          });
          eHoldingSearch.switchToTitles();
          eHoldingsTitlesSearch.bySubject('chemical engineering');
          eHoldingsTitlesSearch.byPublicationType('Journal');
          eHoldingsTitlesSearch.bySelectionStatus(FILTER_STATUSES.NOT_SELECTED);
          eHoldingsTitles.openTitle(1);
          eHoldingsTitle.changePackageStatusViaApi({ isSelected: false });
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.filterPackages();
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.checkPackagesSelectionStatus(FILTER_STATUSES.NOT_SELECTED);
          eHoldingsTitle.openResource();
          eHoldingsResourceView.addToHoldings();
          eHoldingsResourceView.checkHoldingStatus(FILTER_STATUSES.SELECTED);
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
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C700'], retries: 1 },
      () => {
        cy.getAdminToken();
        cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: eHoldingsTitlesSearch.waitLoading,
          });
          eHoldingSearch.switchToTitles();

          // test related with special data from Ebsco
          const selectedResource = {
            title:
              'Preparative biochemistry & biotechnology : an international journal for rapid communications',
            publicationType: 'Journal',
            package: 'Taylor & Francis',
          };
          eHoldingsTitlesSearch.byTitle(selectedResource.title);
          eHoldingsTitlesSearch.byPublicationType(selectedResource.publicationType);
          eHoldingsTitlesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
          eHoldingsTitles.openTitle(0);
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED, selectedResource.package);
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.openResource(0);
          eHoldingsResourceView.goToEdit();
          eHoldingsResourceEdit.swicthToCustomCoverageDates();

          let addedRangesCount = 0;
          const dateRanges = dateTools.getDateRanges(2).map((range) => ({
            startDay: `${dateTools.padWithZero(
              range.startDay.getMonth() + 1,
            )}/${dateTools.padWithZero(range.startDay.getDate())}/${dateTools.padWithZero(
              range.startDay.getFullYear(),
            )}`,
            endDay: `${dateTools.padWithZero(range.endDay.getMonth() + 1)}/${dateTools.padWithZero(
              range.endDay.getDate(),
            )}/${dateTools.padWithZero(range.endDay.getFullYear())}`,
          }));
          dateRanges.forEach((range) => {
            eHoldingsResourceEdit.setCustomCoverageDates(range, addedRangesCount);
            addedRangesCount++;
          });
          eHoldingsResourceEdit.saveAndClose();
          eHoldingsResourceView.waitLoading();
          eHoldingsResourceView.checkCustomPeriods(dateRanges);

          // revert test data
          // TODO: redesign to api requests
          eHoldingsResourceView.goToEdit();
          eHoldingsResourceEdit.removeExistingCustomeCoverageDates();
        });
      },
    );

    it(
      'C691 Remove a title in a package from your holdings (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C691'] },
      () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.uieHoldingsRecordsEdit.gui,
          permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;

          eHoldingsTitles.getSelectedNotCustomTitleViaApi('test').then((specialTitle) => {
            cy.login(userProperties.username, userProperties.password, {
              path: `${TopMenu.eholdingsPath}/titles/${specialTitle.id}`,
              waiter: () => eHoldingsTitle.waitLoading(specialTitle.name),
            });
            eHoldingsTitle.waitPackagesLoading();
            eHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED);
            eHoldingsTitle.waitPackagesLoading();
            eHoldingsTitle.checkPackagesSelectionStatus(FILTER_STATUSES.SELECTED);
            eHoldingsTitle.openResource();
            eHoldingsResourceView.checkHoldingStatus(FILTER_STATUSES.SELECTED);
            eHoldingsResourceView.removeTitleFromHolding();
            eHoldingsResourceView.checkHoldingStatus(FILTER_STATUSES.NOT_SELECTED);

            // reset test data
            eHoldingsResourceView.addToHoldings();
          });
        });
      },
    );

    it(
      'C693 Create a custom title. (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C693'] },
      () => {
        cy.getAdminToken();
        cy.createTempUser([
          permissions.uieHoldingsRecordsEdit.gui,
          permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          eHoldingsPackages.getCustomPackageViaApi().then((packageName) => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: eHoldingsTitlesSearch.waitLoading,
            });
            eHoldingSearch.switchToTitles();
            const title = eHoldingsTitles.create(packageName);
            eHoldingsResourceView.checkNames(packageName, title);
          });
        });
      },
    );

    it(
      'C157916 Title - Packages accordion - Filter by Holding Status (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C157916'] },
      () => {
        cy.getAdminToken();
        cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: eHoldingsTitlesSearch.waitLoading,
          });

          const title = 'Journal of Fish Biology';
          eHoldingSearch.switchToTitles();
          eHoldingsTitle.searchTitle(title);
          eHoldingsTitlesSearch.openTitle(title);
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED);
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.checkOnlySelectedPackagesInResults();
        });
      },
    );

    it(
      'C17090 Title Record - Packages accordion - Filter packages list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C17090'] },
      () => {
        cy.getAdminToken();
        cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: eHoldingsTitlesSearch.waitLoading,
          });

          const selectedResource = {
            title: 'Journal of Fish Biology',
            package: 'Wiley Online Library',
          };
          eHoldingSearch.switchToTitles();
          eHoldingsTitle.searchTitle(selectedResource.title);
          eHoldingsTitlesSearch.openTitle(selectedResource.title);
          eHoldingsTitle.waitPackagesLoading();
          eHoldingsTitle.filterPackages(FILTER_STATUSES.ALL, selectedResource.package);
        });
      },
    );

    afterEach(() => {
      cy.getAdminToken();
      users.deleteViaApi(userId);
    });
  });
});
