import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let id;
    let instanceId;
    const filePath = 'oneMarcBib.mrc';
    const uniquePartOfFileName = getRandomPostfix();
    const uniqueFileName = `C11112 autotestFileName${uniquePartOfFileName}.mrc`;
    const uniqueFileNameForSearch = uniqueFileName.replace('.mrc', '');

    before('create test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      DataImport.uploadFileViaApi(
        filePath,
        uniqueFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instanceId = response[0].instance.id;
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      cy.allure().logCommandSteps(true);
      Logs.openViewAllLogs();
      LogsViewAll.selectOption(LogsViewAll.options[0]);
      LogsViewAll.searchWithTerm(uniqueFileNameForSearch);
      LogsViewAll.getLogId().then((logId) => {
        id = logId;
      });
      LogsViewAll.resetAllFilters();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
    });

    after('delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      cy.allure().logCommandSteps(true);
    });

    it(
      'C11112 Search the "View all" log screen (folijet)',
      { tags: ['dryRun', 'folijet', 'C11112'] },
      () => {
        Logs.openViewAllLogs();

        LogsViewAll.options.forEach((option) => {
          LogsViewAll.selectOption(option);
          // when option is "ID", search with hrId otherwise, with file name
          const term = option === 'ID' ? `${id}` : uniqueFileNameForSearch;

          LogsViewAll.searchWithTerm(term);

          if (option === 'ID') {
            LogsViewAll.checkById({ id });
          } else {
            // file name is always unique
            // so, there is always one row
            LogsViewAll.checkRowsCount(1);
          }
        });
      },
    );
  });
});
