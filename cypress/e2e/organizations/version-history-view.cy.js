import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Agreements from '../../support/fragments/agreements/agreements';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import VersionHistorySection from '../../support/fragments/inventory/versionHistorySection';
import OrganizationVersionHistorySection from '../../support/fragments/organizations/versionHistorySection';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { formatDateTime } from '../../support/utils/acquisitions';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { getFullName } from '../../support/utils/users';

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
  let adminUser;
  let locale;

  before(() => {
    cy.getAdminToken();
    cy.getTenantLocaleApi().then((localeObj) => {
      locale = localeObj;
    });
    cy.getAdminUserDetails().then((userDetails) => {
      adminUser = userDetails.personal;
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

    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganizationInCurrentPage(organization.name);

    Organizations.editOrganization();
    Organizations.addContactToOrganizationWithoutSaving(contactPeople);
    Organizations.addIntrefaceToOrganization(organizationInterface);

    TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.AGREEMENTS);
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
      Permissions.uiOrganizationsViewEdit.gui,
      Permissions.uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.waitLoading();
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
    'C663330 Version history view for Organizations (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C663330'] },
    () => {
      cy.intercept('GET', `/audit-data/acquisition/organization/${organization.id}*`).as(
        'versionHistory',
      );

      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.openVersionHistory();

      cy.wait('@versionHistory').then(({ response }) => {
        const [event1, event2] = response.body.organizationAuditEvents;

        const eventDates = [event1.eventDate, event2.eventDate].map((date) => formatDateTime(locale, date));

        OrganizationVersionHistorySection.selectVersionHistoryCard({ index: 1 });
        OrganizationVersionHistorySection.assertVersionHistoryCard({
          eventDate: eventDates[1],
          index: 1,
          isOriginal: true,
          source: getFullName(adminUser),
        });

        OrganizationVersionHistorySection.selectVersionHistoryCard({ index: 0 });
        OrganizationVersionHistorySection.assertVersionHistoryCard('organization', {
          changedFields: ['Contact people', 'Interface'],
          eventDate: eventDates[0],
          index: 0,
          isCurrent: true,
          source: getFullName(adminUser),
        });
      });

      cy.then(() => {
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
        Organizations.openVersionHistory();
        VersionHistorySection.verifyVersionsCount(3);
      });

      cy.wait('@versionHistory').then(({ response }) => {
        const eventDate = formatDateTime(
          locale,
          response.body.organizationAuditEvents[0].eventDate,
        );

        OrganizationVersionHistorySection.assertVersionHistoryCard({
          changedFields: ['Vendor', 'Contact people', 'Interface'],
          eventDate,
          index: 0,
          isCurrent: true,
          source: user.username,
        });
      });

      cy.then(() => {
        Organizations.checkIsaVendor(organization);
        Organizations.openContactPeopleSection();
        Organizations.checkContactSectionIsEmpty();
        Organizations.openInterfaceSection();
        Organizations.checkInterfaceInformationIsEmpty();
      });
    },
  );
});
