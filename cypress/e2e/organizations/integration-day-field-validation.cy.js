import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import DateTools from '../../support/utils/dateTools';

describe('Organizations', () => {
  let user;
  const organization = {
    ...newOrganization.defaultUiOrganizations,
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
  const integrationName = `IntegrationName${getRandomPostfix()}`;
  const integartionDescription = 'Test Integation descripton1';
  const vendorEDICode = getRandomPostfix();
  const libraryEDICode = getRandomPostfix();
  const UTCTime = DateTools.getUTCDateForScheduling();

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
    Organizations.searchByParameters('Name', organization.name);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
      integrationName,
      integartionDescription,
      vendorEDICode,
      libraryEDICode,
      organization.accounts[0].accountNo,
      'Purchase',
      UTCTime,
    );
    cy.wait(4000);
    cy.createTempUser([permissions.uiOrganizationsViewEdit.gui]).then((userProperties) => {
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
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      Organizations.searchByParameters('Name', organization.name);
      Organizations.selectOrganization(organization.name);
      Organizations.selectIntegration(integrationName);
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
      Organizations.checkIntegrationsAdd(integrationName, integartionDescription);
    },
  );
});
