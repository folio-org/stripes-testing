import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

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
  const secondContact = {
    firstName: `2AT_FN_${getRandomPostfix()}`,
    lastName: `2AT_LN_${getRandomPostfix()}`,
  };
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
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
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
    'C423690 Add privileged donor information in Organization (NOT a vendor) record (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      TopMenuNavigation.navigateToApp('Organizations');
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.addNewDonorContact(secondContact);
      Organizations.closeContact();
      Organizations.addDonorContactToOrganization(secondContact);
      Organizations.checkDonorContactIsAdd(secondContact);
      Organizations.cancelOrganization();
      Organizations.keepEditingOrganization();
      Organizations.saveOrganization();
    },
  );
});
