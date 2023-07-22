import circulationRules from '../../support/fragments/circulation/circulation-rules';
import eHoldingsNewCustomPackage from '../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import organizations from '../../support/fragments/organizations/organizations';
import newRequest from '../../support/fragments/requests/newRequest';
import topMenu from '../../support/fragments/topMenu';
import eHolding from './eHolding';

describe('Create a custom package', () => {
  it('C683-Search packages for [JSTOR]. Filter results to only show selected packages', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.eholdingsPath)
    eHolding.switchToPackage()
    cy.expect(PaneContent({ id: "search-results-content" }).exists());
  })
  it('C692-Create a custom package', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToPackages()
    eHoldingsPackages.create()
  })

  it('C695-Package Record: Search all titles included in a package', () => {
    eHolding.switchToPackageAndSearch()
    eHoldingsPackages.openPackage()
    eHoldingsProviders.titlesSearch()
    eHoldingsProviders.clickSearchTitles()
  })

  it('C17090-Title Record - Packages accordion - Filter packages list', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToTitles()
    eHoldingsProvidersSearch.byProvider("Journal of Fish Biology")
    eHoldingsProviders.viewPackage()
    eHolding.searchButton()
    eHolding.dropdownValuesSelect(['Agricultural & Environmental Science Database (DRAA)', 'Biological Sciences Database (DRAA)'])
    eHolding.searchActions()
    cy.expect(section({ id: "titleShowPackages" }).exists());
  })

  it('C157916-Title - Packages accordion - Filter by Holding Status', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToTitles()
    eHoldingsProvidersSearch.byProvider("Journal of Fish Biology")
    eHoldingsProviders.viewPackage()
    eHolding.searchButton()
    eHolding.bySelectionStatusSection('Selected')
  })

  it('C360543-Check the content of ""Title information"" accordion in ""Title"" detail record', () => {
    cy.visit('https://bugfest-orchid.int.aws.folio.org/eholdings/titles/41327?searchType=titles&q=journal&offset=1')
    eHolding.alternativesTitles();
  })

  it('C367967-Verify that ""Packages"" accordion will return records after collapsing/expanding in ""Provider"" detail record', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsProvidersSearch.byProvider("Wiley")
    eHoldingsProviders.viewProvider()
    eHolding.packageAccordianClick()
    eHolding.packageButtonClick('Collapse all', "false")
    eHolding.packageAccordianClick()
    eHolding.packageButtonClick('Expand all', "true")
  });

  it('C703-Set [Show titles in package to patrons] to Hide', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToPackages()
    eHoldingsProvidersSearch.byProvider("Edinburgh Scholarship Online")
    eHoldingsPackagesSearch.bySelectionStatus('Selected')
    eHoldingsProviders.viewPackage()
    eHolding.editActions()
    eHolding.patronRadioButton()
    eHoldingsProviderEdit.saveAndClose()
  })

  it("C3464-Update Package Proxy", () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider("Edinburgh Scholarship Online");
    eHoldingsProviders.viewPackage();
    eHoldingsPackages.updateProxy()
  });


  it('C343241-Access eholdings app menu', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsNewCustomPackage.clickOneHoldingCarat()
  })

  it("C350635-Check eHoldings Title Search", () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToTitles()
    eHoldingsProvidersSearch.byProvider('Fashion')
    cy.expect(PaneContent({ id: "search-results-content" }).exists());
  });

  it('350418-Check that user can create ""Recall""  Item level request', () => {
    cy.visit(topMenu.requestsPath)
    newRequest.openNewRequestPane()
    newRequest.enterItemInfo('1234567890')
    newRequest.verifyRequestInformation()
    newRequest.enterRequesterInfo({ requesterBarcode: '000000098538', pickupServicePoint: 'API' })
    newRequest.enterRequestAndPatron('Testing')
    newRequest.saveRequestAndClose()
  })

  it('3466-Edit/Add a token to the Gale Academic OneFile', () => {
    cy.visit(topMenu.eholdingsPath)
    eHoldingsSearch.switchToPackages()
    eHoldingsProvidersSearch.byProvider("Gale Academic OneFile")
    eHoldingsPackagesSearch.bySelectionStatus('Selected')
    eHoldingsProviders.viewPackage()
    eHolding.editActions()
    eHolding.providerToken()
    eHoldingsProviderEdit.saveAndClose()
  })

  it('C694-Search providers for [Gale | Cengage]. Then Search list of packages on Provider detail record for all selected packages', () => {
    eHolding.switchToPackages()
    eHoldingsPackages.openPackage()
    eHolding.packageButton()
    eHolding.bySelectionStatusOpen('Selected')
  })
  it('C654-Test behavior for incomplete vs complete circulation rules (i.e., all policy types must be present; else error', () => {
    cy.visit(settingsMenu.circulationRulesPath)
    circulationRules.fillInPolicy({ priorityType: "g ", loanPolicyName: "irina-loan-policy", overdueFinePolicyName: "no-overdue-fine", lostItemFeePolicyName: "lostsetfines", requestPolicyName: "allow-all", noticePolicyName: "julies-check-out-policy", priorityTypeName: "ip" })
    circulationRules.saveCirculationRules()
  })

  it('C656-Ensure interface alerts user of syntax errors in rules', () => {
    cy.visit(settingsMenu.circulationRulesPath)
    circulationRules.policyError({ priorityType: "g ", priorityTypeName: "ip", loanPolicyName: "irina-loan-policy" })
    circulationRules.saveCirculationRules()
    circulationRules.verifyError()
  })

  it('C699-Add or edit package custom coverage', () => {
    eHolding.switchToPackage();
    eHoldingsPackages.openPackage();
    organizations.editOrganization();
    eHolding.editDateRange();

  });
})
