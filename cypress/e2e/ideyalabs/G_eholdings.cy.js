import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import topMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import organisations from '../../support/fragments/organizations/organizations';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import eHoldingsNewCustomPackage from '../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import newRequest from '../../support/fragments/requests/newRequest';
import eHolding from './eHolding';
import settingsMenu from '../../support/fragments/settingsMenu';
import circulationRules from '../../support/fragments/circulation/circulation-rules';

describe('Create a custom package', () => {
  it('C683-Search packages for [JSTOR]. Filter results to only show selected packages', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.eholdingsPath);
    eHolding.SwitchToPackage();
  });
  xit(' C692-Create a custom package', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsPackages.create();
  });

  xit('C695-Package Record: Search all titles included in a package', () => {
    eHolding.SwitchToPackageandsearch();
    eHoldingsPackages.openPackage();
    eHoldingsProviders.titlesSearch();
    eHoldingsProviders.clickSearchTitles();
  });

  xit('C17090 -Title Record - Packages accordion - Filter packages list', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Journal of Fish Biology');
    eHoldingsProviders.viewPackage();
    eHolding.searchButton();
    eHolding.DropdownValuesSelect([
      'Agricultural & Environmental Science Database (DRAA)',
      'Biological Sciences Database (DRAA)',
    ]);
    eHolding.searchActions();
  });

  xit('C157916-Title - Packages accordion - Filter by Holding Status', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Journal of Fish Biology');
    eHoldingsProviders.viewPackage();
    eHolding.searchButton();
    eHolding.bySelectionStatusSection('Selected');
  });

  xit('C360543-Check the content of ""Title information"" accordion in ""Title"" detail record', () => {
    cy.visit(
      'https://bugfest-orchid.int.aws.folio.org/eholdings/titles/41327?searchType=titles&q=journal&offset=1'
    );
    eHolding.alternativesTitles();
  });

  xit(' C367967	Verify that ""Packages"" accordion will return records after collapsing/expanding in ""Provider"" detail record', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider('Wiley');
    eHoldingsProviders.viewProvider();
    eHolding.PackageAccordianClick();
    eHolding.PackageAccordianClick();
    eHolding.PackageButtonClick('Collapse all');
    eHolding.PackageAccordianClick();
    eHolding.PackageAccordianClick();
    eHolding.PackageButtonClick('Expand all');
  });

  xit(' C703-Set [Show titles in package to patrons] to Hide', () => {
    cy.visit(topMenu.eholdingsPath);
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

  xit('C3464__Update Package Proxy', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
    eHoldingsProviders.viewPackage();
    eHoldingsPackages.updateProxy();
  });

  xit('C343241__Access eholdings app menu', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsNewCustomPackage.clickOneHoldingCarat();
  });

  xit('C350635-Check eHoldings Title Search', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Fashion');
  });

  xit('350418__Check that user can create ""Recall""  Item level request', () => {
    cy.visit(topMenu.requestsPath);
    newRequest.openNewRequestPane();
    newRequest.enterItemInfo('1234567890');
    newRequest.verifyRequestInformation();
    newRequest.enterRequesterInfo({
      requesterBarcode: '000000098538',
      pickupServicePoint: 'API',
    });
    newRequest.enterrequestAndpatron('Testing');
    newRequest.saveRequestAndClose();
  });

  xit('3466__Edit/Add a token to the Gale Academic OneFile', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider('Gale Academic OneFile');
    eHoldingsPackagesSearch.bySelectionStatus('Selected');
    eHoldingsProviders.viewPackage();
    eHolding.editactions();
    eHolding.providerToken();
    eHoldingsProviderEdit.saveAndClose();
  });

  xit('C694-Search providers for [Gale | Cengage]. Then Search list of packages on Provider detail record for all selected packages', () => {
    eHolding.SwitchTopackage();
    eHoldingsPackages.openPackage();
    eHolding.packageButton();
    eHolding.bySelectionStatusOpen('Selected');
  });

  xit('C654-Test behavior for incomplete vs complete circulation rules (i.e., all policy types must be present; else error', () => {
    cy.visit(settingsMenu.circulationRulesPath);
    circulationRules.fillInPolicy({
      priorityType: 'g ',
      loanPolicyName: 'irina-loan-policy',
      overdueFinePolicyName: 'no-overdue-fine',
      lostItemFeePolicyName: 'lostsetfines',
      requestPolicyName: 'allow-all',
      noticePolicyName: 'julies-check-out-policy',
      priorityTypeName: 'ip',
    });
    circulationRules.saveCirculationRules();
  });

  xit('C656-Ensure interface alerts user of syntax errors in rules', () => {
    circulationRules.policyError({
      priorityType: 'g ',
      priorityTypeName: 'ip',
      loanPolicyName: 'irina-loan-policy',
    });
    circulationRules.saveCirculationRules();
    circulationRules.verifyError();
  });
});
