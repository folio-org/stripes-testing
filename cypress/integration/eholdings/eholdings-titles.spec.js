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
    cy.visit(TopMenu.eholding);
    eHoldingSearch.switchToTitles();
  });
  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals.', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingSearch.bySubject('chemical engineering');
    eHoldingSearch.byPublicationType('Journal');
    eHoldingsTitles.openTitle();
    // TODO: the issue with filtering by subject, continue after issue UIEH-1225 solving
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
    eHoldingSearch.bySubject('*');
    eHoldingSearch.byPublicationType('Streaming Audio');
    eHoldingSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages(eHoldingsTitle.filterPackagesStatuses.selected);
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.openResource();
    // cy.then(() => Pane().id())
    //   .then(resourceId => {
    //     cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
    //     cy.do(Button('Edit').click());

    //     cy.intercept('/eholdings/resources**').as('getResource');
    //     cy.wait('@getResource').then((req) => {
    //       eHoldingsResourceEdit.waitLoading();
    //       cy.log(JSON.stringify(req.response?.body));
    //       return req?.response?.body?.attributes?.customCoverages.length;
    //     });
    //   });
    //const rangesCount = eHoldingsResourceView.goToEdit();

    // eHoldingsResourceEdit.swicthToCustomCoverageDates();
    // if (rangesCount > 0) {
    //   eHoldingsResourceEdit.removeExistingCustomeCoverageDates(rangesCount);
    // }

    // let addedRangesCount = 0;
    // dateTools.getDateRanges(2, true).map(range => ({
    //   startDay : `${range.startDay.getMonth() + 1}/${range.startDay.getDate()}/${range.startDay.getFullYear()}`,
    //   endDay : `${range.endDay.getMonth() + 1}/${range.endDay.getDate()}/${range.endDay.getFullYear()}`
    // })).forEach(range => {
    //   eHoldingsResourceEdit.setCustomCoverageDates(range, addedRangesCount);
    //   addedRangesCount++;
    // });
    // eHoldingsResourceEdit.saveAndClose();
    // eHoldingsResourceView.waitLoading();
  });
});
