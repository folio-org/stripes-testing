import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    isVendor: false,
  };
  const vendorInformation = {
    paymentMethod: 'Cash',
    vendorTermsName: `autotest_vendor_terms_${getRandomPostfix()}`,
    accountName: `autotest_account_${getRandomPostfix()}`,
    accountNumber: `autotest_account_no_${getRandomPostfix()}`,
    accountStatus: 'Pending',
  };
  let user;

  before('Create user and organization', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((organizationId) => {
      organization.id = organizationId;
    });
    cy.createTempUser([Permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
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
    'C730 Make existing organization a Vendor (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C730'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.selectVendor();
      Organizations.addVendorInformation(vendorInformation);
      Organizations.varifySaveOrganizationCalloutMessage(organization);
    },
  );
});
