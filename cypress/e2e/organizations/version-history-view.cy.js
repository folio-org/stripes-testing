import Permissions from '../../support/dictionary/permissions';
import Agreements from '../../support/fragments/agreements/agreements';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    isDonor: true,
    privilegedContacts: [],
    isVendor: false,
  };
  const privilegedContact = { ...NewOrganization.defaultContact };
  const organizationInterface = { ...NewOrganization.defaultInterface };
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

  before(() => {
    cy.getAdminToken();
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

    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganizationInCurrentPage(organization.name);
    Organizations.getLastUpdateTime().then((time) => {
      preUpdated = time.replace(' ', ', ');
    });
    Organizations.editOrganization();
    Organizations.addContactToOrganizationWithoutSaving(contactPeople);
    Organizations.addIntrefaceToOrganization(organizationInterface);
    Organizations.verifySaveCalloutMessage(organization);
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
    Agreements.getIdViaApi(defaultAgreement.name).then((agreementId) => {
      Agreements.deleteViaApi(agreementId);
    });
    Organizations.deleteContactViaApi(contactPeople.id);
    Organizations.deletePrivilegedContactsViaApi(privilegedContact.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C663330 Version history view for Organizations',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.openVersionHistory();
      Organizations.selectVersionHistoryCard(preUpdated);
      VersionHistorySection.verifyVersionHistoryCardWithTime(
        1,
        preUpdated,
        'Diku_admin',
        'ADMINISTRATOR',
        true,
        false,
      );
      Organizations.selectVersionHistoryCard(afterUpdated);
      VersionHistorySection.verifyVersionHistoryCardWithTime(
        0,
        afterUpdated,
        'Diku_admin',
        'ADMINISTRATOR',
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
