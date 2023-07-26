import eHoldings from '../../support/a_ideyalabs/eHolding';
import agreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import newAgreement from '../../support/fragments/agreements/newAgreement';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import topMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Creating New Agreement', () => {
  const defaultAgreement = {
    name: `autotest_agreement_${getRandomPostfix()}`,
    status: 'Active',
    startDate: dateTools.getCurrentDate(),
  };
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C757__Create an Agreement', () => {
    cy.visit(topMenu.agreementsPath);
    newAgreement.newButtonClick();
    newAgreement.fill();
    newAgreement.save();
    newAgreement.validateDateAndTime();
  });
  it('C1295__Create a new Agreement and attach a package', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldings.packageSearch();
    eHoldingsPackages.openPackage();
    newAgreement.newButton();
    newAgreement.fill(defaultAgreement);
    newAgreement.save();
    newAgreement.agreementLine();
  });
  after('remove the test data', () => {
    newAgreement.findAgreement(defaultAgreement);
    newAgreement.deleteAgreement();
    newAgreement.searchAgreement();
    agreementsDetails.remove();
  });
});
