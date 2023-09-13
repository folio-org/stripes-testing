import testTypes from '../../../support/dictionary/testTypes';
import Organizations from '../../../support/fragments/organizations/organizations';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const categoryName = `Test${randomFourDigitNumber()}`;

describe.skip('Settings', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C731 Create new categories (thunderjet)', { tags: [testTypes.ideaLabsTests] }, () => {
    cy.visit(SettingsMenu.organizationsPath);
    Organizations.addNewCategory(categoryName);
    cy.visit(TopMenu.organizationsPath);
    Organizations.searchByParameters('All', 'organization');
    Organizations.selectOrganization('New organization');
    Organizations.editOrganization();
    Organizations.verifyNewCategory(categoryName);
    cy.visit(SettingsMenu.organizationCategoryPath);
    Organizations.deleteCreatedCategory(categoryName);
  });
});
