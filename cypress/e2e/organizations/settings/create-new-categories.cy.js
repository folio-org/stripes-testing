import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import SettingsOrganizations from '../../../support/fragments/settings/organizations/settingsOrganizations';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Organizations --> Settings', () => {
  const categoryName = `Category_${getRandomPostfix()}`;
  const contact = { ...NewOrganization.defaultContact };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let user;

  before('Create user and organization', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    cy.createTempUser([
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiSettingsOrganizationsCanViewAndEditSettings.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrganizationsPath,
          waiter: SettingsOrganizations.waitLoadingOrganizationSettings,
        });
        cy.reload();
        SettingsOrganizations.waitLoadingOrganizationSettings();
      }, 20_000);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it('C731 Create new categories (thunderjet)', { tags: ['extendedPath', 'thunderjet'] }, () => {
    SettingsOrganizations.selectCategories();
    SettingsOrganizations.clickNewCategoriesButton();
    SettingsOrganizations.fillCategoryName(categoryName);
    SettingsOrganizations.saveCategoryChanges();
    SettingsOrganizations.checkCategoriesTableContent(categoryName);

    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.editOrganization();
    Organizations.openContactPeopleSection();
    Organizations.addNewContactWithCategory(contact, categoryName);
  });
});
