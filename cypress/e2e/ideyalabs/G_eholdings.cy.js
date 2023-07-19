/**
 * C692-Create a custom package
 * "1. Under Search and Filter pane, select Packages toggle
2. Click New button on the Package screen (also known as the second pane) or use shortcut key alt + n (for Windows) / Option + n (for Mac)
3. Fill in at least the required fields (marked with asterisk)
4. Click """"save"""" OR use keyboard shortcut ctrl + s (for Windows) / cmd + s (for Mac)"
 */

// import eHolding from "../../support/fragments/eholdings/eHolding";
// import eHolding from "../../support/fragments/eholdings/eHolding";
// import eHoldingsPackage from "../../support/fragments/eholdings/eHoldingsPackage";
// import eHoldingsPackages from "../../support/fragments/eholdings/eHoldingsPackages";
// import eHoldingsProviders from "../../support/fragments/eholdings/eHoldingsProviders";
// import eHoldingsProvidersSearch from "../../support/fragments/eholdings/eHoldingsProvidersSearch";
// import eHoldingsSearch from "../../support/fragments/eholdings/eHoldingsSearch";
// import topMenu from "../../support/fragments/topMenu";


import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import TopMenu from '../../support/fragments/topMenu';
import { Button, TextField, TextArea, Section } from '../../../interactors';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';

import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import organisations from '../../support/fragments/organizations/organizations';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';

import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import eHoldingsNewCustomPackage from '../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import newRequest from '../../support/fragments/requests/newRequest';
import eHolding from './eHolding';

import settingsMenu from '../../support/fragments/settingsMenu';
import circulationRules from '../../support/fragments/circulation/circulation-rules';
// import eHolding from '../../support/fragments/eholdings/eHolding';

const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000;

describe('Create a custom package', () => {
  it('C683-Search packages for [JSTOR]. Filter results to only show selected packages', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.eholdingsPath);
    eHolding.SwitchToPackage();
  });
  it(' C692-Create a custom package', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsPackages.create();
  });


  it('C695-Package Record: Search all titles included in a package', () => {
    eHolding.SwitchToPackageandsearch();
    eHoldingsPackages.openPackage();
    eHoldingsProviders.titlesSearch();
    eHoldingsProviders.clickSearchTitles();
  });

  it('C17090 -Title Record - Packages accordion - Filter packages list', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Journal of Fish Biology');
    eHoldingsProviders.viewPackage();
    cy.do(Button({ icon: 'search' }).click());
    cy.wait(2000);
    eHolding.DropdownValuesSelect(['Agricultural & Environmental Science Database (DRAA)', 'Biological Sciences Database (DRAA)']);
    eHolding.searchActions();
  });

  it('C157916-Title - Packages accordion - Filter by Holding Status', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Journal of Fish Biology');
    eHoldingsProviders.viewPackage();
    cy.do(Button({ icon: 'search' }).click());
    cy.wait(1000);
    eHolding.bySelectionStatusSection('Selected');
  });

  it('C360543-Check the content of ""Title information"" accordion in ""Title"" detail record', () => {
    cy.visit(TopMenu.eholdingsPath);
    cy.visit('https://bugfest-orchid.int.aws.folio.org/eholdings/titles/41327?searchType=titles&q=journal&offset=1');
    cy.expect(Section({ id: 'titleShowTitleInformation' }).exists());
    eHolding.alternativesTitles();
  });

  it(' C367967	Verify that ""Packages"" accordion will return records after collapsing/expanding in ""Provider"" detail record', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider('Wiley');
    eHoldingsProviders.viewProvider();
    eHolding.PackageAccordianClick();
    eHolding.PackageAccordianClick();
    eHolding.PackageButtonClick('Collapse all');
    cy.wait(2000);
    eHolding.PackageAccordianClick();
    eHolding.PackageAccordianClick();
    eHolding.PackageButtonClick('Expand all');
  });

  it(' C703-Set [Show titles in package to patrons] to Hide', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
    eHoldingsPackagesSearch.bySelectionStatus('Selected');
    eHoldingsProviders.viewPackage();
    eHolding.editactions();
    eHolding.patronRadiobutton();
    eHoldingsProviderEdit.saveAndClose();
  });


  it('C699-Add or edit package custom coverage', () => {
    eHolding.SwitchToPackage();
    eHoldingsPackages.openPackage();
    organisations.editOrganization();
    eHolding.editDateRange();
  });

  it('C3464__Update Package Proxy', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
    eHoldingsProviders.viewPackage();
    eHoldingsPackages.updateProxy();
  });


  it('C343241__Access eholdings app menu', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsNewCustomPackage.clickOneHoldingCarat();
  });

  it('C350635-Check eHoldings Title Search', () => {
    cy.visit(TopMenu.eholdingsPath);

    eHoldingsSearch.switchToTitles();

    eHoldingsProvidersSearch.byProvider('Fashion');
  });


  // it('C9236__Settings: Add/Edit a custom label', () => {

  //     cy.visit(SettingsMenu.eHoldingsPath)

  //     eHoldingsPackage.customLabel({ label1: 'AutomatingTheFolioApplicationAndTestingApplication', label2: 'Test :' })

  // })


  it('350418__Check that user can create ""Recall""  Item level request', () => {
    cy.visit(TopMenu.requestsPath);

    newRequest.openNewRequestPane();

    newRequest.enterItemInfo('1234567890');

    newRequest.verifyRequestInformation();

    newRequest.enterRequesterInfo({ requesterBarcode:'000000098538', pickupServicePoint:'API' });

    newRequest.enterrequestAndpatron('Testing');

    newRequest.saveRequestAndClose();
  });

  it('Edit/Add a token to the Gale Academic OneFile', () => {
    // cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.visit(TopMenu.eholdingsPath);

    eHoldingsSearch.switchToPackages();

    eHoldingsProvidersSearch.byProvider('Gale Academic OneFile');

    eHoldingsPackagesSearch.bySelectionStatus('Selected');

    eHoldingsProviders.viewPackage();

    eHolding.editactions();

    cy.do(TextArea({ name:'providerTokenValue' }).fillIn(`Test${RandomNumber}`));

    eHoldingsProviderEdit.saveAndClose();
  });
  it('C694-Search providers for [Gale | Cengage]. Then Search list of packages on Provider detail record for all selected packages', () => {
    eHolding.SwitchTopackage();
    eHoldingsPackages.openPackage();
    eHolding.packageButton();
    eHolding.bySelectionStatusOpen('Selected');
  });
  it('C654-Test behavior for incomplete vs complete circulation rules (i.e., all policy types must be present; else error', () => {
    // cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.visit(TopMenu.settingsPath);

    cy.visit(settingsMenu.circulationRulesPath);

    circulationRules.fillInPolicy({ priorityType:'g ', loanPolicyName:'irina-loan-policy', overdueFinePolicyName:'no-overdue-fine', lostItemFeePolicyName:'lostsetfines', requestPolicyName:'allow-all', noticePolicyName:'julies-check-out-policy', priorityTypeName:'ip' });

    circulationRules.saveCirculationRules();
  });



  it('C656-Ensure interface alerts user of syntax errors in rules', () => {
    circulationRules.policyError({ priorityType:'g ', priorityTypeName:'ip', loanPolicyName:'irina-loan-policy' });

    circulationRules.saveCirculationRules();

    circulationRules.verifyError();
  });
});
