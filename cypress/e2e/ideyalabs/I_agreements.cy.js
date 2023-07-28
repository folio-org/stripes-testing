import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import agreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import newAgreement from '../../support/fragments/agreements/newAgreement';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import topMenu from '../../support/fragments/topMenu';
import dateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import eHoldings from '../../support/a_ideyalabs/eHolding';

describe('Agreement', () => {
  const defaultAgreement = {
    name: `autotest_agreement_${getRandomPostfix()}`,
    status: 'Active',
    startDate: dateTools.getCurrentDate()
  };
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C757 Create an Agreement (ERM)', { tags: [testTypes.smoke, devTeams.erm] }, () => {
    cy.visit(topMenu.agreementsPath);
    newAgreement.newButtonClick();
    newAgreement.fill();
    newAgreement.save();
    newAgreement.validateDateAndTime();
  });
  it('C1295 Create a new Agreement and attach a package (spitfire)', { tags: [testTypes.extendedPath, devTeams.spitfire] }, () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldings.packageSearch();
    eHoldingsPackages.openPackage();
    newAgreement.newButton();
    newAgreement.fill(defaultAgreement);
    newAgreement.save();
    newAgreement.agreementLine();
  });
  after('delete test data', () => {
    newAgreement.findAgreement(defaultAgreement);
    newAgreement.deleteAgreement();
    newAgreement.searchAgreement();
    agreementsDetails.remove();
  });
});
