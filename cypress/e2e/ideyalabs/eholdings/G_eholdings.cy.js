import testTypes from '../../../support/dictionary/testTypes';
import eHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import eHoldingsProviderEdit from '../../../support/fragments/eholdings/eHoldingsProviderEdit';
import eHoldingsProviders from '../../../support/fragments/eholdings/eHoldingsProviders';
import eHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import organizations from '../../../support/fragments/organizations/organizations';
import newRequest from '../../../support/fragments/requests/newRequest';
import topMenu from '../../../support/fragments/topMenu';
import eHolding from './eHolding';

describe.skip('Create a custom package', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.eholdingsPath);
  });
  after('Deleting created Package', () => {
    eHolding.deletePackage();
  });
  // test below is implemented in scope of FAT-1303 in:
  // cypress/e2e/eholdings/eholdings-packages-search.cy.js
  it(
    'C683 Search packages for [JSTOR]. Filter results to only show selected packages (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      eHolding.switchToPackage();
      eHolding.verifyPackage();
    },
  );
  // test below is implemented in scope of FAT-1306 in:
  // cypress/e2e/eholdings/eholdings-packages-search.cy.js
  it('C692 Create a custom package', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHolding.createAndVerify();
  });
  it(
    'C360543 Check the content of ""Title information"" accordion in ""Title"" detail record (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(
        'https://bugfest-orchid.int.aws.folio.org/eholdings/titles/41327?searchType=titles&q=journal&offset=1',
      );
      eHolding.verifyAlternativesTitles();
    },
  );
  it(
    'C367967 Verify that ""Packages"" accordion will return records after collapsing/expanding in ""Provider"" detail record (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.eholdingsPath);
      eHoldingsProvidersSearch.byProvider('Wiley');
      eHoldingsProviders.viewProvider();
      eHolding.packageAccordionClick();
      eHolding.verifyPackageButtonClick('Collapse all', 'false');
      eHolding.packageAccordionClick();
      eHolding.verifyPackageButtonClick('Expand all', 'true');
    },
  );
  it(
    'C703 Set [Show titles in package to patrons] to Hide (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.eholdingsPath);
      eHoldingsSearch.switchToPackages();
      eHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
      eHoldingsProviders.viewPackage();
      eHolding.editActions();
      eHolding.patronRadioButton();
      eHoldingsProviderEdit.saveAndClose();
      eHolding.verifyAlternativeRadio();
    },
  );
  it('C648 Closed Library Due Date (vega)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Fashion');
    eHoldingsProvidersSearch.verifyTitleSearch();
  });
  it(
    'C350418 Check that user can create ""Recall""  Item level request (vega)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.requestsPath);
      newRequest.openNewRequestPane();
      newRequest.enterItemInfo('1234567890');
      newRequest.verifyRequestInformation();
      newRequest.enterRequesterInfo({
        requesterBarcode: '000000098538',
        pickupServicePoint: 'API',
      });
      newRequest.enterRequestAndPatron('Testing');
      newRequest.saveRequestAndClose();
    },
  );
  it(
    'C3466 Edit/Add a token to the Gale Academic OneFile (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.eholdingsPath);
      eHoldingsSearch.switchToPackages();
      eHoldingsProvidersSearch.byProvider('Gale Academic OneFile');
      eHoldingsProviders.viewPackage();
      eHolding.editActions();
      eHolding.providerToken();
      eHolding.checkToken();
    },
  );
  it(
    'C699 Add or edit package custom coverage (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.eholdingsPath);
      eHolding.switchToPackage();
      organizations.editOrganization();
      eHolding.generateRandomDates();
      eHolding.verifyAlternativeDates();
    },
  );
  it('C343241 Access eholdings app menu (spitfire)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsNewCustomPackage.clickOneHoldingCarat();
  });
});
