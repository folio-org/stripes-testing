import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;

    before('Create test user and login', () => {
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

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C357984 Confirm that the logs are in default sort order on the View all page when "Reset all" button is pressed (folijet)',
      { tags: ['extendedPathBroken', 'folijet', 'C357984'] },
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
              cy.wait(3000);
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
