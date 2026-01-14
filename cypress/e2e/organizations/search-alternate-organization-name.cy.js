import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    aliases: [
      {
        value: `Amazon_${getRandomPostfix()}`,
        description: `Amazon_${getRandomPostfix()}`,
      },
    ],
  };
  let user;

  before('Create user and organization with alias', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    cy.createTempUser([Permissions.uiOrganizationsView.gui]).then((userProperties) => {
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
    'C677 Search an alternate organization name (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C677'] },
    () => {
      Organizations.searchByParameters('Alias', organization.aliases[0].value);
      Organizations.checkSearchResults(organization);
      Organizations.resetFilters();
      Organizations.searchByParameters('All', organization.aliases[0].value);
      Organizations.checkSearchResults(organization);
    },
  );
});
