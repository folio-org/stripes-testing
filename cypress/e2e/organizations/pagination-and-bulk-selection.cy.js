import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import SearchHelper from '../../support/fragments/finance/financeHelper';

describe('Organizations', () => {
  let user;
  const organization = { ...newOrganization.defaultUiOrganizations };
  const contactIds = [];

  before('Create user, organization, and contacts', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });

    for (let i = 0; i < 101; i++) {
      Organizations.createContactViaApi({
        firstName: `ActiveContact${i + 1}`,
        lastName: 'Test',
        inactive: false,
      }).then((contactId) => {
        contactIds.push(contactId);
      });
    }

    Organizations.createContactViaApi({
      firstName: 'InactiveContact1',
      lastName: 'Test',
      inactive: true,
    }).then((contactId) => {
      contactIds.push(contactId);
    });

    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
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
    contactIds.forEach((contactId) => {
      Organizations.deleteContactViaApi(contactId);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C359169 Next/previous pagination and bulk selection in "Add contacts" dialog (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C359169'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.filterContactsByStatus('Inactive');
      Organizations.verifyPaginationInContactList();
      Organizations.resetFilters();
      Organizations.selectActiveStatus();
      Organizations.verifyPaginationInContactList();
      Organizations.selectAllContactsOnPage();
      Organizations.verifyTotalSelected(50);
      Organizations.clickNextPaginationButton();
      Organizations.verifyPaginationInContactList();
      SearchHelper.selectCheckboxFromResultsList(0);
      SearchHelper.selectCheckboxFromResultsList(1);
      Organizations.verifyTotalSelected(52);
      Organizations.clickPreviousPaginationButton();
      SearchHelper.selectCheckboxFromResultsList();
      Organizations.verifyTotalSelected(51);
      Organizations.clickNextPaginationButton();
      SearchHelper.selectCheckboxFromResultsList(3);
      Organizations.verifyTotalSelected(52);
      Organizations.clickSaveButton();
    },
  );
});
