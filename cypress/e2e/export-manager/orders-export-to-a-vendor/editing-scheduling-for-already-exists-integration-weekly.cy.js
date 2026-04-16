import moment from 'moment';

import { ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import ExportDetails from '../../../support/fragments/exportManager/exportDetails';
import {
  Integrations,
  NewOrganization,
  Organizations,
} from '../../../support/fragments/organizations';
import OrganizationDetails from '../../../support/fragments/organizations/organizationDetails';
import IntegrationViewForm from '../../../support/fragments/organizations/integrations/integrationViewForm';
import IntegrationEditForm from '../../../support/fragments/organizations/integrations/integrationEditForm';
import OrganizationsSearchAndFilter from '../../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
    const now = moment();
    const weekDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayOfWeek = weekDays[moment.utc().day()];
    const today = moment().format('M/D/YYYY');
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      integration: {},
      integrationName: '',
      scheduledTimeFormatted: '',
      scheduledTimeView: '',
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

            const scheduledTime = moment.utc();
            scheduledTime.set('minutes', scheduledTime.minutes() + 5);
            testData.scheduledTimeFormatted = scheduledTime.format('h:mm A');
            testData.scheduledTimeView = scheduledTime.format('HH:mm:ss');

            testData.integration = Integrations.getDefaultIntegration({
              vendorId: testData.organization.id,
              acqMethodId: acqMethod.id,
              accountNoList: [testData.organization.accounts[0].accountNo],
              ediSchedule: {
                enableScheduledExport: true,
                scheduleParameters: {
                  schedulePeriod: 'DAY',
                  scheduleFrequency: 1,
                  scheduleTime: scheduledTime.format('HH:mm:ss'),
                },
              },
            });
            testData.integrationName =
              testData.integration.exportTypeSpecificParameters.vendorEdiOrdersExportConfig.configName;
            Integrations.createIntegrationViaApi(testData.integration).then((integration) => {
              testData.integration.id = integration.id;

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
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C360088 Editing scheduling for already exists integration method (select "Weekly" option) (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C360088'] },
      () => {
        OrganizationsSearchAndFilter.searchByParameters('Name', testData.organization.name);
        Organizations.checkSearchResults(testData.organization);
        Organizations.selectOrganization(testData.organization.name);

        OrganizationDetails.selectIntegration(testData.integrationName);
        IntegrationViewForm.verifySchedulingTime(testData.scheduledTimeView);

        IntegrationViewForm.openIntegrationEditForm();
        IntegrationEditForm.verifySchedulingTime(testData.scheduledTimeFormatted);

        Organizations.verifySchedulePeriodOptions();

        now.set('minutes', now.minutes() + 2);
        IntegrationEditForm.updateScheduleOptions({
          period: 'Weekly',
          frequency: '1',
          time: now.utc().format('h:mm A'),
        });
        IntegrationEditForm.selectSchedulingDay(currentDayOfWeek);

        IntegrationEditForm.clickSaveButton();

        // Step 8: Wait 2 minutes and go to "Export manager" app
        cy.wait(120000);
        TopMenu.openExportManagerApp();
        ExportManagerSearchPane.waitLoading();

        ExportManagerSearchPane.selectOrganizationsSearch();

        ExportManagerSearchPane.selectExportMethod(testData.integrationName);

        ExportManagerSearchPane.selectJobByIntegrationInList(testData.integrationName);
        ExportDetails.checkExportJobDetails({
          exportInformation: [
            { key: 'Source', value: 'System' },
            { key: 'Start time', value: today },
            { key: 'Organization', value: testData.organization.name },
            { key: 'Export method', value: testData.integrationName },
          ],
        });
      },
    );
  });
});
