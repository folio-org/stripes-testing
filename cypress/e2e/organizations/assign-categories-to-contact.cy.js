import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrganizations from '../../support/fragments/settings/organizations/settingsOrganizations';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  const category1 = { ...SettingsOrganizations.defaultCategories };
  const category2 = { id: uuid(), value: `autotest_category_name_2_${getRandomPostfix()}` };
  const contact = { ...NewOrganization.defaultContact };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    contacts: [],
  };
  let user;

  before('Create user, organization, and categories', () => {
    cy.getAdminToken();
    SettingsOrganizations.createCategoriesViaApi(category1);
    SettingsOrganizations.createCategoriesViaApi(category2);
    Organizations.createContactViaApi(contact).then((contactId) => {
      contact.id = contactId;
      organization.contacts.push(contactId);
      Organizations.createOrganizationViaApi(organization).then((orgId) => {
        organization.id = orgId;
      });
    });
    cy.createTempUser([permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C732 Assign categories to contact person (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C732'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.openContactPeopleSectionInEditCard();
      Organizations.clickContactRecord(contact);
      Organizations.clickEdit();
      Organizations.addCategoryToContact(category1.value);
      Organizations.clickEdit();
      Organizations.addCategoryToContact(category2.value);
      Organizations.closeContact();
      Organizations.openContactPeopleSectionInEditCard();
      Organizations.checkCategoryIsAddToContactPeopleSection([category1.value, category2.value]);
      Organizations.cancelOrganization();
      Organizations.checkCategoryIsAddToContactPeopleSection([category1.value, category2.value]);
    },
  );
});
