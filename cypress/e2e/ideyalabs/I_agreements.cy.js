import TopMenu from '../../support/fragments/topMenu';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import eHoldings from './eHolding';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';

describe('Creating New Agreement', () => {
  it('C757__Create an Agreement', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.agreementsPath);
    NewAgreement.NewButton();
    NewAgreement.fill();
    NewAgreement.save();
    NewAgreement.waitLoading();
  });
  it('C1295__Create a new Agreement and attach a package', () => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldings.packageSearch();
    eHoldingsPackages.openPackage();
    NewAgreement.newButton();
    NewAgreement.fill();
    NewAgreement.save();
    NewAgreement.agreementLine();
  });
});
