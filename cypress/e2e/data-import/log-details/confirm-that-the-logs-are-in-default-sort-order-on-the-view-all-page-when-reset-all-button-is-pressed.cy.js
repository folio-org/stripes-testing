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
        Permissions.dataImportDeleteLogs.gui,
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
        const jobProfileColumn = 'Job profile';
        Logs.openViewAllLogs();
        LogsViewAll.checkByReverseChronologicalOrder();
        LogsViewAll.getAllLogsColumnsResults(jobProfileColumn).then((beforeFilteringCells) => {
          LogsViewAll.filterJobsByJobProfile('Inventory Single Record - Default Create Instance');
          LogsViewAll.checkByJobProfileName('Inventory Single Record - Default Create Instance');
          LogsViewAll.getAllLogsColumnsResults(jobProfileColumn).then(
            (afterFilteringByJobProfileCells) => {
              cy.expect(beforeFilteringCells).to.not.deep.equal(afterFilteringByJobProfileCells);
              LogsViewAll.checkByReverseChronologicalOrder();
              LogsViewAll.resetAllFilters(false);
              LogsViewAll.getAllLogsColumnsResults(jobProfileColumn).then(
                (afterResetFilteringCells) => {
                  LogsViewAll.checkByReverseChronologicalOrder();
                  cy.expect(afterResetFilteringCells).to.not.deep.equal(
                    afterFilteringByJobProfileCells,
                  );
                  cy.expect(beforeFilteringCells).to.deep.equal(afterResetFilteringCells);
                },
              );
            },
          );
        });
      },
    );
  });
});
