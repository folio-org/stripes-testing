import testTypes from '../../../support/dictionary/testTypes';
import agreementsDetails from '../../../support/fragments/agreements/agreementsDetails';
import newAgreement from '../../../support/fragments/agreements/newAgreement';
import eHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import topMenu from '../../../support/fragments/topMenu';
import dateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const defaultAgreement = {
  name: `autotest_agreement_${getRandomPostfix()}`,
  status: 'Active',
  startDate: dateTools.getCurrentDate()
};
describe('Agreement', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Delete test data', () => {
    newAgreement.findAgreement(defaultAgreement);
    newAgreement.deleteAgreement();
    newAgreement.searchAgreement();
    agreementsDetails.remove();
  });

  it('C757 Create an Agreement (ERM)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.agreementsPath);
    newAgreement.newButtonClick();
    newAgreement.fill();
    newAgreement.save();
    newAgreement.validateDateAndTime();
  });

  it('C1295 Create a new Agreement and attach a package (spitfire)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsPackages.packageSearch();
    eHoldingsPackages.openPackage();
    newAgreement.newButton();
    newAgreement.fill(defaultAgreement);
    newAgreement.save();
    newAgreement.agreementLine();
  });
});
