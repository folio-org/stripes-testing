import Permissions from '../../../support/dictionary/permissions';
import ExportManagerSettings, {
  ExportManagerJobsSettings,
} from '../../../support/fragments/settings/export-manager';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';

const USER_PROPS = 'userProperties';

describe('Export Manager', () => {
  describe('Settings', () => {
    const flow = new ExecutionFlowManager();

    before('Create test data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.exportManagerSettingsView.gui])
        .then((userProps) => flow.set(USER_PROPS, userProps, () => Users.deleteViaApi(userProps.userId)))
        .then(() => {
          const user = flow.get(USER_PROPS);

          cy.login(user.username, user.password, {
            path: ExportManagerSettings.path,
            waiter: ExportManagerSettings.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C813000 Default deletion intervals for job types are configured and not editable for the user with view-only capabilities (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C813000'] },
      () => {
        ExportManagerSettings.selectExportManagerJobsSettings();
        ExportManagerJobsSettings.waitLoading();
        ExportManagerJobsSettings.assertFieldsValues(
          ExportManagerJobsSettings.jobDeletionIntervals,
          { viewOnly: true },
        );
        ExportManagerJobsSettings.assertSaveButtonDisabled();
      },
    );
  });
});
