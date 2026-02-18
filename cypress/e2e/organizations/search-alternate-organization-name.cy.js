import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

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
      OrganizationsSearchAndFilter.searchByParameters('Alias', organization.aliases[0].value);
      Organizations.checkSearchResults(organization);
      Organizations.resetFilters();
      OrganizationsSearchAndFilter.searchByParameters('All', organization.aliases[0].value);
      Organizations.checkSearchResults(organization);
    },
  );
});
