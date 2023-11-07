import moment from 'moment';

import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  NewOrganization,
  Organizations,
  Integrations,
} from '../../../support/fragments/organizations';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const now = moment();
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      order: {},
      orderLine: {},
      integration: {},
      integrationName: '',
      user: {},
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

            testData.integration = Integrations.getDefaultIntegration({
              vendorId: testData.organization.id,
              acqMethodId: acqMethod.id,
              accountNoList: [testData.organization.accounts[0].accountNo],
              ediSchedule: {},
            });
            testData.integrationName =
              testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
            Integrations.createIntegrationViaApi(testData.integration);
          });
        });
      });

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
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Integrations.deleteIntegrationViaApi(testData.integration.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C377048 Setting "daily" scheduling on 12 PM for new export Integration (thunderjet) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.thunderjet] },
      () => {
        // Click on the "Name" link for Organization
        Organizations.searchByParameters('Name', testData.organization.name);
        Organizations.checkSearchResults(testData.organization);
        const OrganizationDetails = Organizations.selectOrganization(testData.organization.name);

        // Expand "Integration details" accordion, Select integration
        const IntegrationViewForm = OrganizationDetails.selectIntegration(testData.integrationName);

        // Click "Actions" button, Select "Edit" option
        const IntegrationEditForm = IntegrationViewForm.openIntegrationEditForm();
        IntegrationEditForm.checkButtonsConditions([
          { label: 'Cancel', conditions: { disabled: false } },
          { label: 'Save & close', conditions: { disabled: true } },
        ]);

        // Populate fields in "Scheduling" accordion
        now.set('minutes', now.minutes() + 1);
        IntegrationEditForm.setScheduleOptions({ time: now.utc().format('hh:mm A') });

        // Click "Save & close" button
        IntegrationEditForm.clickSaveButton({ timeOut: 60000 });

        // Go to "Export manager" app
        cy.visit(TopMenu.exportManagerPath);
        ExportManagerSearchPane.waitLoading();

        // Click "Organizations", Select created export method in "Export method" accordion
        ExportManagerSearchPane.selectOrganizationsSearch();
        ExportManagerSearchPane.selectExportMethod(testData.integrationName);
        const ExportDetails = ExportManagerSearchPane.selectJobByIntegrationInList(
          testData.integrationName,
        );
        ExportDetails.checkExportJobDetails([
          { key: 'Source', value: 'System' },
          { key: 'Organization', value: testData.organization.name },
          { key: 'Export method', value: testData.integrationName },
        ]);
      },
    );
  });
});
