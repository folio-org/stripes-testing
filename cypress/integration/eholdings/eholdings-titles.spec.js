/// <reference types="cypress" />

import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../support/fragments/eholdings/eHoldingsTitles';
import eHoldingsResource from '../../support/fragments/eholdings/eHoldingsResource';
import TopMenu from '../../support/fragments/topMenu';
import { testType, feature } from '../../support/utils/tagTools';
import { Pane, Section, Button } from '../../../interactors';

describe('eHoldings titles management', () => {
  beforeEach(() => {
    // TODO: specify new user with permissions eHoldings: eHoldings: Can view providers, packages, titles detail records
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.eholding);
    eHoldingSearch.switchToTitles();
    eHoldingSearch.bySubject('chemical engineering');
    eHoldingSearch.byPublicationType('Journal');
  });
  it('C684 Title Search: Search titles for chemical engineering. Then filter results to journals.', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingsTitles.openTitle();
    // TODO: the issue with filtering by subject, continue after issue UIEH-1225 solving
  });
  it('C16994 Add a title in a package to holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
    eHoldingSearch.bySelectionStatus(eHoldingsTitle.filterPackagesStatuses.notSelected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.checkPackagesSelectionStatus(eHoldingsTitle.filterPackagesStatuses.notSelected);
    eHoldingsTitle.openPackage();
    eHoldingsResource.addToHoldings();
    cy.then(() => Pane().id())
      .then(resourceId => {
        cy.do(Section({ id: resourceId }).find(Button('Actions')).click());
        cy.expect(Button('Edit').exists());
        cy.expect(Button('Remove title from holdings').exists());
      });
  });
});
