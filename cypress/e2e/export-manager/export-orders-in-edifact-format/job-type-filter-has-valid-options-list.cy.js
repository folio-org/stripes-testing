import moment from 'moment';

import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    const now = moment();
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
          }).then(({ body: { acquisitionMethods } }) => {
            const acqMethod = acquisitionMethods.find(
              ({ value }) => value === ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            );

            now.set('second', now.second() + 10);
            testData.integration = Integrations.getDefaultIntegration({
              vendorId: testData.organization.id,
              acqMethodId: acqMethod.id,
              scheduleTime: now.utc().format('HH:mm:ss'),
            });
            Integrations.createIntegrationViaApi(testData.integration);
          });
        });
      });

      cy.createTempUser([Permissions.exportManagerAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.exportManagerPath,
          waiter: ExportManagerSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Integrations.deleteIntegrationViaApi(testData.integration.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C378884 "EDIFACT orders export" option is added to job type filter in "Export manager" app (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C378884'] },
      () => {
        // Check default page view
        ExportManagerSearchPane.checkDefaultView();

        // Check "Successful" checkboxe in the "Status" accordion on "Search & filter" pane
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Successful' });
        ExportManagerSearchPane.checkColumnInResultsTable({ status: 'Successful' });

        // Check "Failed" checkboxe in the "Status" accordion on "Search & filter" pane
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Failed', resetAll: true });
        ExportManagerSearchPane.checkColumnInResultsTable({ status: 'Failed' });

        // Click on "Reset all" button on the "Search & filters" pane
        ExportManagerSearchPane.resetAll();
        ExportManagerSearchPane.checkNoResultsMessage();

        // Check "Job type" contains the following options:
        ExportManagerSearchPane.checkFilterOptions({
          jobTypeFilterOption: [
            'Authority control',
            'Bursar',
            'Circulation log',
            'eHoldings',
            'Orders (EDI)',
            'Orders (CSV)',
          ],
        });

        // Check "EDIFACT orders export" option in "Job type" accordion
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (EDI)' });
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (CSV)' });
        ExportManagerSearchPane.checkColumnInResultsTable({ jobType: 'EDIFACT orders export' });

        // Uncheck "EDIFACT orders export" option in "Job type" accordion
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (EDI)' });
        ExportManagerSearchPane.checkFilterOption({ filterName: 'Orders (CSV)' });
        ExportManagerSearchPane.checkNoResultsMessage();
      },
    );
  });
});
