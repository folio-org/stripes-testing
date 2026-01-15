import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    name: `1_autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    cy.createTempUser([permissions.uiOrganizationsViewEditCreate.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    'C421980 Create a donor Organization (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C421980'] },
    () => {
      Organizations.createDonorOrganization(organization);
      Organizations.closeDetailsPane();
      Organizations.selectIsDonorFilter('Yes');
      Organizations.selectOrganization(organization.name);
      Organizations.checkOrganizationInfo(organization);
      Organizations.closeDetailsPane();
      Organizations.resetFilters();
      Organizations.selectIsDonorFilter('No');
      Organizations.organizationIsAbsent(organization.name);
      Organizations.resetFilters();
    },
  );
});
