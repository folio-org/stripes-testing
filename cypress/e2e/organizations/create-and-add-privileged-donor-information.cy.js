import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('Organizations', () => {
  let user;
  const organization = { ...newOrganization.defaultUiOrganizations, isDonor: false };
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
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
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
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
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
      Organizations.deleteContactFromContactPeople();
      Organizations.cancelOrganization();
      Organizations.keepEditingOrganization();
      Organizations.saveOrganization();
      cy.wait(4000);
      Organizations.checkPrivilegedDonorInformationIsEmpty();
    },
  );
});
