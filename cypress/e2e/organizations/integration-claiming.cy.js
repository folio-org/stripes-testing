import { including } from '@interactors/html';
import permissions from '../../support/dictionary/permissions';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import DateTools from '../../support/utils/dateTools';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';

describe('Organizations', () => {
  let user;
  const organization = {
    ...newOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const integrationInfo1 = {
    integrationName: `IntegrationName1${getRandomPostfix()}`,
    integrationDescription: 'Test Integation descripton1',
    integrationType: 'Ordering',
  };
  const integrationInfo2 = {
    integrationType: 'Claiming',
  };
  const integrationInfo3 = {
    transmissionMethod: 'File download',
    fileFormat: 'CSV',
  };
  const integrationInfo4 = {
    transmissionMethod: 'FTP',
  };
  const integrationInfo5 = {
    fileFormat: 'EDI',
    ordersMessageForVendor: true,
    acquisitionMethod: 'Approval Plan',
    ediFTP: 'FTP',
    connectionMode: 'Active',
    serverAddress: true,
  };
  const integrationInfo6 = {
    integrationType: 'Ordering',
    accountNumber: organization.accounts[0].accountNo,
    vendorEDICode: `VendorEdiCode${getRandomPostfix()}`,
    libraryEDICode: `LibraryEdiCode${getRandomPostfix()}`,
  };
  const integrationInfo7 = {
    integrationType: 'Claiming',
    fileFormat: 'CSV',
  };
  const schedulingInfo1 = {
    period: 'Daily',
    frequency: '1',
    time: DateTools.getUTCDateForScheduling(),
  };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.createTempUser([
      permissions.uiOrganizationsViewEdit.gui,
      permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Organizations.deleteOrganizationViaApi(organization.id);
  });

  it(
    'C688767 Create claiming integration, edit, duplicate and delete duplicated integration (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C688767'] },
    () => {
      OrganizationsSearchAndFilter.searchByParameters('Name', organization.name);
      Organizations.checkSearchResults(organization);
      Organizations.selectOrganization(organization.name);
      Organizations.addIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo1,
      );
      Organizations.checkTransmissionAndFileFormatState(true);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo2,
      );
      Organizations.checkTransmissionAndFileFormatState(false);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo3,
      );
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.selectIntegration(integrationInfo1.integrationName);
      Organizations.editIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo4,
      );
      Organizations.saveOrganization();
      Organizations.checkFieldsAreRequired(['Server address*', 'FTP port*']);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo5,
      );
      Organizations.saveOrganization();
      Organizations.checkFieldsAreRequired([
        'Account numbers*',
        'Vendor EDI code*',
        'Library EDI code*',
      ]);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
        fileFormat: 'CSV',
      });
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.editIntegration();
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo6,
      );
      Organizations.clickSchedulingEDICheckbox();
      Organizations.fillScheduleInfo(schedulingInfo1);
      Organizations.saveOrganization();
      Organizations.duplicateIntegration();
      Organizations.cancelOrganization();
      Organizations.duplicateIntegration();
      Organizations.confirmDuplicateIntegration();
      InteractorsTools.checkCalloutDuplicatedMessage(integrationInfo1.integrationName);
      Organizations.selectIntegration(including(`Copy of ${integrationInfo1.integrationName}`));
      Organizations.editIntegration();
      cy.wait(4000);
      Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation(
        integrationInfo7,
      );
      Organizations.saveOrganization();
      InteractorsTools.checkCalloutMessage('Integration was saved');
      Organizations.deleteIntegration();
      Organizations.confirmDeleteIntegration();
      InteractorsTools.checkCalloutMessage('The integration was successfully deleted');
    },
  );
});
