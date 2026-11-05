import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import { ExportManagerSearchPane, Exports } from '../../../../support/fragments/exportManager';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting', () => {
      const todayWithoutPaddingZero = DateTools.clearPaddingZero(
        DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY'),
      );
      const expectedJobValues = {
        status: 'Successful',
        jobType: 'Failed updates: Linked bibliographic fields',
        description: 'List of controlled bibliographic fields failed to update',
        outputType: 'Failed updates: Linked bibliographic fields (CSV)',
      };
      const authorityControlJobType = 'Authority control';
      let userData;

      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
        ]).then((userProperties) => {
          userData = userProperties;

          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C375997 Correct data for "Failed updates: linked bibliographic fields (CSV)" report shown in "Export manager" (promin)',
        { tags: ['extendedPath', 'promin', 'C375997'] },
        () => {
          // Step 1: open Actions - "Reports" section with both report options
          MarcAuthorities.openActionsMenuAndVerifyReportOptions();

          // Step 2: select "Failed updates: linked bibliographic fields (CSV)" - the toast
          // carries the Job ID of the job started by this click
          cy.intercept('POST', '/data-export-spring/jobs').as('createFailedUpdatesReportJob');
          MarcAuthorities.clickFailedLinkedBibUpdatesReportButton();
          cy.wait('@createFailedUpdatesReportJob', { timeout: 10_000 }).then((interception) => {
            const jobId = interception.response.body.name;
            const expectedJobData = [
              jobId,
              expectedJobValues.status,
              expectedJobValues.jobType,
              expectedJobValues.description,
              userData.username,
              todayWithoutPaddingZero,
            ];
            const expectedJobDetails = {
              jobID: jobId,
              status: expectedJobValues.status,
              jobType: expectedJobValues.jobType,
              outputType: expectedJobValues.outputType,
              description: expectedJobValues.description,
              source: userData.username,
              startDate: todayWithoutPaddingZero,
              endDate: todayWithoutPaddingZero,
            };

            MarcAuthorities.checkCalloutAfterFailedLinkedBibUpdatesReport(jobId);
            // The report must be finished to be shown as "Successful" in Export manager
            Exports.getFinishedExportJobViaApi(interception.response.body.id);

            // Step 3: Export manager - main page, second pane is empty
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();

            // Step 4: "Job type" accordion includes "Authority control"
            ExportManagerSearchPane.checkFilterOptions({
              jobTypeFilterOption: [authorityControlJobType],
            });

            // Step 5: select "Authority control" - the job with the Job ID from the toast is
            // in the list (looked up by Job ID, other runs may add jobs of this type too)
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.verifyJobDataInResults(expectedJobData);

            // Step 6: open that job's detail view - all fields
            ExportManagerSearchPane.openJobDetailView(jobId);
            ExportManagerSearchPane.verifyJobDataInDetailView(expectedJobDetails);
          });
        },
      );
    });
  });
});
