import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import Logs from '../../../support/fragments/data_import/logs/logs';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;

    before('create temp user', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C357984 Confirm that the logs are in default sort order on the View all page when "Reset all" button is pressed (folijet) (null)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.checkByReverseChronologicalOrder();
        const beforeFiltertingCells = LogsViewAll.getMultiColumnListCellsValues(
          LogsViewAll.visibleColumns.JOB_PROFILE.columnIndex,
        );
        LogsViewAll.filterJobsByJobProfile('Default - Create SRS MARC Authority');
        LogsViewAll.checkByJobProfileName('Default - Create SRS MARC Authority');
        const afterFilteringByJobProfileCells = LogsViewAll.getMultiColumnListCellsValues(
          LogsViewAll.visibleColumns.JOB_PROFILE.columnIndex,
        );
        cy.expect(beforeFiltertingCells).to.not.equal(afterFilteringByJobProfileCells);
        LogsViewAll.checkByReverseChronologicalOrder();
        LogsViewAll.resetAllFilters();
        const afterFilteringResetCells = LogsViewAll.getMultiColumnListCellsValues(
          LogsViewAll.visibleColumns.JOB_PROFILE.columnIndex,
        );
        cy.expect(afterFilteringResetCells).to.not.equal(afterFilteringByJobProfileCells);
        cy.expect(beforeFiltertingCells).to.equal(afterFilteringResetCells);
      },
    );
  });
});
