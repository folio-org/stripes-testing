import Permissions from '../../support/dictionary/permissions';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        name: `autotest_name_${getRandomPostfix()}`,
        accountNo: getRandomPostfix(),
        description: 'This is my account description.',
        paymentMethod: 'EFT',
        accountStatus: 'Active',
      },
    ],
  };
  const informationForIntegration = {
    integrationName: `IntegrationName${getRandomPostfix()}`,
    integrationDescription: 'Test Integation descripton',
    integrationType: 'Ordering',
    vendorEDICode: getRandomPostfix(),
    libraryEDICode: getRandomPostfix(),
    ordersMessageForVendor: true,
    accountNumber: organization.accounts[0].accountNo,
    acquisitionMethod: 'Purchase',
    ediFTP: 'FTP',
    connectionMode: 'Active',
    serverAddress: true,
  };

  const schedulingInfo1 = {
    period: 'Monthly',
    day: '12345',
    time: DateTools.getUTCDateForScheduling(),
  };
  const schedulingInfo2 = {
    period: 'Monthly',
    day: '32',
    time: DateTools.getUTCDateForScheduling(),
  };
  const schedulingInfo3 = {
    period: 'Monthly',
    day: '-12',
    time: DateTools.getUTCDateForScheduling(),
  };
  const schedulingInfo4 = {
    period: 'Monthly',
    day: '23',
    time: DateTools.getUTCDateForScheduling(),
  };

  before('Create user, organization, and integration', () => {
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    Organizations.createOrganizationViaApi(organization).then((orgId) => {
      organization.id = orgId;
    });
    OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
      informationForIntegration,
    );
    Organizations.saveOrganization();
    cy.wait(4000);
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
    'C434063 "Day" field on Integration edit page accepts only numbers less than "31" (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C434063'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.selectIntegration(informationForIntegration.integrationName);
      Organizations.editIntegration();
      Organizations.clickSchedulingEDICheckbox();
      Organizations.fillScheduleInfo(schedulingInfo1);
      Organizations.checkDayFieldError();
      Organizations.fillScheduleInfo(schedulingInfo2);
      Organizations.checkDayFieldError();
      Organizations.fillScheduleInfo(schedulingInfo3);
      Organizations.checkDayFieldError('Value must be greater than or equal to 1');
      Organizations.fillScheduleInfo(schedulingInfo4);
      Organizations.saveOrganization();
      Organizations.closeIntegrationDetailsPane();
      Organizations.checkIntegrationsAdd(
        informationForIntegration.integrationName,
        informationForIntegration.integrationDescription,
      );
    },
  );
});
