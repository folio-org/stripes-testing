/// <reference types="cypress" />

import { Button, Pane, Section } from '../../../../interactors';
import eHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import eHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import eHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import eHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import TopMenu from '../../../support/fragments/topMenu';
import dateTools from '../../../support/utils/dateTools';
import { parseSanityParameters } from '../../../support/utils/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const { user, memberTenant } = parseSanityParameters();

    it(
      'C16994 Add a title in a package to holdings (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C16994'] },
      () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: eHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
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
      },
    );

    it(
      'C700 Title: Add or Edit custom coverage (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C700'], retries: 1 },
      () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: eHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
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
      },
    );

    it('C693 Create a custom title. (spitfire)', { tags: ['dryRun', 'spitfire', 'C693'] }, () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

      eHoldingsPackages.getCustomPackageViaApi().then((packageName) => {
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: eHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
        eHoldingSearch.switchToTitles();
        const title = eHoldingsTitles.create(packageName);
        eHoldingsResourceView.checkNames(packageName, title);
      });
    });
  });
});
