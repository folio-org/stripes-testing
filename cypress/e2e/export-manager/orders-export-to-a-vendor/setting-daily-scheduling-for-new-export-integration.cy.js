import moment from 'moment';

import { DEFAULT_WAIT_TIME } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';
import IntegrationEditForm from '../../../support/fragments/organizations/integrations/integrationEditForm';
import IntegrationStates from '../../../support/fragments/organizations/integrations/integrationStates';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrganizationDetails from '../../../support/fragments/organizations/organizationDetails';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const now = moment();
    const today = moment().format('M/D/YYYY');
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      user: {},
    };
    const integrationName = `IntegrationName${getRandomPostfix()}`;
    const integrationDescription = 'Test Integration description';
    const vendorEDICode = getRandomPostfix();
    const libraryEDICode = getRandomPostfix();

    before('Create test data', () => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(testData.organization);

      cy.createTempUser([
        Permissions.exportManagerAll.gui,
        Permissions.uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit.gui,
        Permissions.uiOrganizationsViewEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.organizationsPath,
          waiter: Organizations.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    it(
      'C350595 Setting "daily" scheduling for new export Integration (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C350595'] },
      () => {
        OrganizationsSearchAndFilter.searchByParameters('Name', testData.organization.name);
        Organizations.checkSearchResults(testData.organization);
        Organizations.selectOrganization(testData.organization.name);

        OrganizationDetails.addIntegration();

        Organizations.fillIntegrationInformationWithoutSchedulingWithDifferentInformation({
          integrationName,
          integrationDescription,
          vendorEDICode,
          libraryEDICode,
          sendAccountNumber: true,
          ordersMessageForVendor: true,
          invoicesMessageForVendor: true,
          accountNumber: testData.organization.accounts[0].accountNo,
          acquisitionMethod: 'Purchase',
          ediFTP: 'FTP',
          ftpMode: 'ASCII',
          connectionMode: 'Active',
          serverAddress: true,
          integrationType: 'Ordering',
        });

        Organizations.clickSchedulingEDICheckbox();
        Organizations.verifySchedulePeriodOptions();
        Organizations.clickSchedulingEDICheckbox();

        now.set('minutes', now.minutes() + 1);
        IntegrationEditForm.setScheduleOptions({
          period: 'Daily',
          frequency: '1',
          time: now.utc().format('hh:mm A'),
        });

        Organizations.saveOrganization();
        InteractorsTools.checkCalloutMessage(IntegrationStates.integrationSaved);

        TopMenu.openExportManagerApp();
        ExportManagerSearchPane.waitLoading();

        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(integrationName);

        /*
          It may take some time for the export job to be created and displayed in the list after the integration is saved.
          This function implements an exponential backoff strategy to repeatedly check for the presence of the export job in the list, reloading the page and waiting longer between attempts if the job is not found.
        */
        cy.recurse(
          () => cy.get('[data-test-results-pane] [data-test-pane-header-sub]'),
          ($el) => {
            // If the export job is found in the list, return true to stop the recursion.
            if ($el.text().includes('record')) {
              return true;
            }

            cy.reload();
            return false;
          },
          { delay: DEFAULT_WAIT_TIME },
        );

        ExportManagerSearchPane.selectJobByIntegrationInList(integrationName);

        ExportDetails.checkExportJobDetails({
          exportInformation: [
            { key: 'Status', value: 'Failed' },
            { key: 'Source', value: 'System' },
            { key: 'Start time', value: today },
            { key: 'End time', value: today },
            { key: 'Organization', value: testData.organization.name },
            { key: 'Export method', value: integrationName },
            { key: 'Sent to', value: 'ftp://ftp.ci.folio.org/files' },
          ],
        });
      },
    );
  });
});
