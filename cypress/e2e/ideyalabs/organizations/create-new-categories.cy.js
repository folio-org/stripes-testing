import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import Organizations from '../../../support/fragments/organizations/organizations';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import { getFourDigitRandomNumber } from '../../../support/utils/stringTools';

const categoryName = `Test${getFourDigitRandomNumber()}`;

describe('Settings', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C731 Create new categories (thunderjet)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(SettingsMenu.organizationsPath);
      Organizations.addNewCategory(categoryName);
      cy.visit(TopMenu.organizationsPath);
      Organizations.searchByParameters('All', 'organization');
      Organizations.selectOrganization('New organization');
      Organizations.editOrganization();
      Organizations.verifyNewCategory(categoryName);
      cy.visit(SettingsMenu.organizationCategoryPath);
      Organizations.deleteCreatedCategory(categoryName);
    }
  );
});
