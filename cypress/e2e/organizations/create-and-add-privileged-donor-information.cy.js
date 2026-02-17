import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Organizations', () => {
  let user;
  const organization = { ...NewOrganization.defaultUiOrganizations, isDonor: false };
  const contact = {
    lastName: 'Doe',
    firstName: 'John',
    note: 'Privileged donor contact',
    status: 'Active',
    category: 'Payment',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    url: 'http://example.com',
    contactId: '',
  };

  before('Create user and organization', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
    });

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

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.getPrivilegedContactByName(contact.firstName, contact.lastName).then(
      (contactId) => {
        if (contactId) {
          contact.contactId = contactId.id;
          Organizations.deletePrivilegedContactsViaApi(contact.contactId);
        }
      },
    );
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423618 Create and add privileged donor information in Organization (vendor) record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C423618'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.editOrganization();
      Organizations.selectDonorCheckbox();
      Organizations.openPrivilegedDonorInformationSection();
      Organizations.saveOrganization();
      Organizations.editOrganization();
      Organizations.addNewDonorContactWithFullInformation(contact);
      Organizations.closeContact();
      Organizations.openPrivilegedDonorInformationSection();
      Organizations.checkDonorContactIsAdd(contact);
      Organizations.cancelOrganization();
      Organizations.editOrganization();
      Organizations.openPrivilegedDonorInformationSection();
      Organizations.clickAddDonorButton();
      Organizations.closeAddDonorModal();
      Organizations.deleteDonorFromPrivilegedDonorInformation();
      Organizations.cancelOrganization();
      Organizations.keepEditingOrganization();
      Organizations.saveOrganization();
      cy.wait(4000);
      Organizations.checkPrivilegedDonorInformationIsEmpty();
    },
  );
});
