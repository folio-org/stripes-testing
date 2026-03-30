import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    name: `1_autotest_name_${getRandomPostfix()}`,
    status: 'Active',
    code: `autotest_code_${getRandomPostfix()}`,
    isVendor: false,
    isDonor: true,
    erpCode: `ERP-${getRandomPostfix()}`,
  };
  const firstContact = { ...NewOrganization.defaultContact };
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.editOrganization();
    Organizations.addNewDonorContact(firstContact);
    Organizations.closeContact();
    Organizations.addDonorContactToOrganization(firstContact);
    Organizations.checkDonorContactIsAdd(firstContact);
    Organizations.saveOrganization();
    cy.createTempUser([
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
    ]).then((userProperties) => {
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
    'C423623 A user with "Organizations: can view privileged donor information" permission can only view privileged donor information (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423623'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.openPrivilegedDonorInformationSection();
      Organizations.checkDonorContactIsAdd(firstContact);
      Organizations.verifyAddDonorButtonIsAbsent();
    },
  );
});
