import eHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import eHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
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
    { tags: ['ideaLabsTests'] },
    () => {
      eHolding.switchToPackage();
      eHolding.verifyPackage();
    },
  );
  // test below is implemented in scope of FAT-1306 in:
  // cypress/e2e/eholdings/eholdings-packages-search.cy.js
  it('C692 Create a custom package', { tags: ['ideaLabsTests'] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHolding.createAndVerify();
  });

  it('C648 Closed Library Due Date (vega)', { tags: ['ideaLabsTests'] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToTitles();
    eHoldingsProvidersSearch.byProvider('Fashion');
    eHoldingsProvidersSearch.verifyTitleSearch();
  });
  it('C343241 Access eholdings app menu (spitfire)', { tags: ['ideaLabsTests'] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsNewCustomPackage.clickOneHoldingCarat();
  });
});
