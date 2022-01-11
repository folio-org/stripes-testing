/// <reference types="cypress" />

import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../support/fragments/eholdings/eHoldingsTitles';
import eHoldingsResourceView from '../../support/fragments/eholdings/eHoldingsResourceView';
import TopMenu from '../../support/fragments/topMenu';
import { testType, feature } from '../../support/utils/tagTools';
import { Pane, Section, Button } from '../../../interactors';
import eHoldingsResourceEdit from '../../support/fragments/eholdings/eHoldingResourceEdit';
import dateTools from '../../support/utils/dateTools';


describe('eHoldings titles management', () => {
  beforeEach(() => {
    // TODO: specify new user with permissions eHoldings: eHoldings: Can view providers, packages, titles detail records
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.eholdings);
    eHoldingSearch.switchToTitles();
  });
  it('C16994 Add a title in a package to holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingSearch.bySubject('chemical engineering');
    eHoldingSearch.byPublicationType('Journal');
    eHoldingSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.notSelected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.checkPackagesSelectionStatus(eHoldingsTitle.filterPackagesStatuses.notSelected);
    eHoldingsTitle.openResource();
    eHoldingsResourceView.addToHoldings();
    cy.then(() => Pane().id())
      .then(resourceId => {
        cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
        cy.expect(Button('Edit').exists());
        cy.expect(Button('Remove title from holdings').exists());
      });
  });
  it.only('C700 Title: Add or Edit custom coverage', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    // test related with special data from Ebsco
    const selectedResource = {
      title: 'Preparative biochemistry & biotechnology : an international journal for rapid communications',
      publicationType: 'Journal',
      package: 'Taylor & Francis'
    };
    eHoldingSearch.byTitle(selectedResource.title);
    eHoldingSearch.byPublicationType(selectedResource.publicationType);
    eHoldingSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages(eHoldingsTitle.filterPackagesStatuses.selected, selectedResource.package);
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.openResource();
    eHoldingsResourceView.goToEdit();
    eHoldingsResourceEdit.swicthToCustomCoverageDates();

    let addedRangesCount = 0;
    const dateRanges = dateTools.getDateRanges(2).map(range => ({
      startDay : `${dateTools.padWithZero(range.startDay.getMonth() + 1)}/${dateTools.padWithZero(range.startDay.getDate())}/${dateTools.padWithZero(range.startDay.getFullYear())}`,
      endDay : `${dateTools.padWithZero(range.endDay.getMonth() + 1)}/${dateTools.padWithZero(range.endDay.getDate())}/${dateTools.padWithZero(range.endDay.getFullYear())}`
    }));
    dateRanges.forEach(range => {
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
  it('C691 Remove a title in a package from your holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingSearch.bySubject('chemical engineering');
    eHoldingSearch.byPublicationType('Journal');
    eHoldingSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.checkPackagesSelectionStatus(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitle.openResource();
    eHoldingsResourceView.checkHoldingStatus(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsResourceView.removeTitleFromHolding();
  });

  it('C693 Create a custom title.', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingsTitles.create();
  });
});
