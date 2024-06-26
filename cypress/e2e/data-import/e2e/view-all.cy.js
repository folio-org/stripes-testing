import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let id;
    let instanceId;
    const filePath = 'oneMarcBib.mrc';
    const uniquePartOfFileName = getRandomPostfix();
    const uniqueFileName = `C11112 autotestFileName${uniquePartOfFileName}.mrc`;
    const uniqueFileNameForSearch = `C11112 autotestFileName${uniquePartOfFileName}_1.mrc`;

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        filePath,
        uniqueFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instanceId = response[0].instance.id;
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      Logs.openViewAllLogs();
      LogsViewAll.selectOption(LogsViewAll.options[0]);
      LogsViewAll.searchWithTerm(uniqueFileNameForSearch);
      LogsViewAll.getLogId().then((logId) => {
        id = logId;
      });
      LogsViewAll.resetAllFilters();
      cy.visit(TopMenu.dataImportPath);
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it('C11112 Search the "View all" log screen (folijet)', { tags: ['smoke', 'folijet'] }, () => {
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
    });
  });
});
