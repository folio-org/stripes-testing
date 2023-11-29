import testTypes from '../../../support/dictionary/testTypes';
import eHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import eHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
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
  it('C343241 Access eholdings app menu (spitfire)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsNewCustomPackage.clickOneHoldingCarat();
  });
});
