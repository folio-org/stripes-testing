import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import Agreements from '../../support/fragments/agreements/agreements';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import InteractorsTools from '../../support/utils/interactorsTools';
import permissions from '../../support/dictionary/permissions';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';

describe('Organizations', () => {
  const organization = {
    ...newOrganization.defaultUiOrganizations,
    isDonor: true,
    privilegedContacts: [],
    isVendor: false,
  };
  const privilegedContact = { ...newOrganization.defaultContact };
  const organizationInterface = { ...newOrganization.defaultInterface };
  const contactPeople = {
    firstName: `AT_FN_${getRandomPostfix()}_2`,
    lastName: `AT_LN_${getRandomPostfix()}_2`,
  };
  const defaultAgreement = { ...NewAgreement.getdefaultAgreement() };
  const calloutMessage = `Agreement created: ${defaultAgreement.name}`;
  const colloutMessage2 = `Agreement updated: ${defaultAgreement.name}`;
  let user;
  let preUpdated;
  let afterUpdated;
  let lastUpdate;
  let adminUser;

  before(() => {
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    cy.getAdminUserDetails().then((admin) => {
      adminUser = admin.username;
    });
    Organizations.createInterfaceViaApi(organizationInterface).then((interfaceId) => {
      organizationInterface.id = interfaceId;
    });
    Organizations.createContactViaApi(contactPeople).then((contactId) => {
      contactPeople.id = contactId;
    });
    Organizations.createPrivilegedContactViaApi(privilegedContact).then((response) => {
      privilegedContact.id = response;
      organization.privilegedContacts.push(response);
      Organizations.createOrganizationViaApi(organization).then((organizationResponse) => {
        organization.id = organizationResponse;
      });
    });
    cy.wait(7000);

    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganizationInCurrentPage(organization.name);
    Organizations.getLastUpdateTime().then((time) => {
      preUpdated = time.replace(' ', ', ');
    });
    Organizations.editOrganization();
    Organizations.addContactToOrganizationWithoutSaving(contactPeople);
    Organizations.addIntrefaceToOrganization(organizationInterface);
    Organizations.varifySaveOrganizationCalloutMessage(organization);
    Organizations.getLastUpdateTime().then((time) => {
      afterUpdated = time.replace(' ', ', ');
    });
    cy.visit(TopMenu.agreementsPath);
    Agreements.createAndCheckFields(defaultAgreement);
    cy.wait(4000);
    InteractorsTools.checkCalloutMessage(calloutMessage);
    Agreements.editAgreement();
    Agreements.addOrganization(organization);
    cy.wait(4000);
    InteractorsTools.checkCalloutMessage(colloutMessage2);

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

  after(() => {
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
      authRefresh: true,
    });
    Agreements.selectRecord(defaultAgreement.name);
    Agreements.deleteAgreement();
    Organizations.deleteContactViaApi(contactPeople.id);
    Organizations.deletePrivilegedContactsViaApi(privilegedContact.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C663330 Version history view for Organizations',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.openVersionHistory();
      Organizations.selectVersionHistoryCard(preUpdated);
      VersionHistorySection.verifyVersionHistoryCardWithTime(
        1,
        preUpdated,
        adminUser,
        adminUser,
        true,
        false,
      );
      Organizations.selectVersionHistoryCard(afterUpdated);
      VersionHistorySection.verifyVersionHistoryCardWithTime(
        0,
        afterUpdated,
        adminUser,
        adminUser,
        false,
        true,
      );
      Organizations.checkInterfaceIsAddInOrganizationDetailsPage(organizationInterface.name);
      Organizations.checkContactIsAddToContactPeopleSection(contactPeople);
      VersionHistorySection.clickCloseButton();
      Organizations.editOrganization();
      Organizations.openContactPeopleSectionInEditPage();
      Organizations.deleteContactFromContactPeople();
      Organizations.openInterfaceSection();
      Organizations.deleteInterfaceFromInterfaces();
      Organizations.selectVendor();
      Organizations.saveOrganization();
      Organizations.getLastUpdateTime().then((time) => {
        lastUpdate = time.replace(' ', ', ');
      });
      Organizations.openVersionHistory();
      VersionHistorySection.verifyVersionsCount(3);
      VersionHistorySection.verifyListOfChanges(['Vendor', 'Contact people', 'Interface']);
      VersionHistorySection.verifyVersionHistoryCardWithTime(
        0,
        lastUpdate,
        'testPermFirst',
        user.username,
        false,
        true,
      );
      Organizations.checkIsaVendor(organization);
      Organizations.openContactPeopleSection();
      Organizations.checkContactSectionIsEmpty();
      Organizations.openInterfaceSection();
      Organizations.checkInterfaceInformationIsEmpty();
    },
  );
});
