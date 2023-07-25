import agreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import newAgreement from '../../support/fragments/agreements/newAgreement';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import topMenu from '../../support/fragments/topMenu';
import eHoldings from './eHolding';

describe('Creating New Agreement', () => {
  it('C757__Create an Agreement', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(topMenu.agreementsPath);
    newAgreement.newButtonClick();
    newAgreement.fill();
    newAgreement.save();
    newAgreement.validateDateAndTime();
    agreementsDetails.remove();
  });

  it('C1295__Create a new Agreement and attach a package', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldings.packageSearch();
    eHoldingsPackages.openPackage();
    newAgreement.newButton();
    newAgreement.fill();
    newAgreement.save();
    newAgreement.agreementLine();
    newAgreement.removeAgreement();
  });
});
