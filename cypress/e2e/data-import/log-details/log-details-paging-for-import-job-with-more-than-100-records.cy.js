import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    // 100 records are shown on a page - 105 records give exactly two pages, both of them are
    // the edge ones (Previous is disabled on the first page, Next - on the second one)
    const recordsPerPage = 100;
    const recordsCount = 105;
    const marcFileName = `AT_C353602_MarcFile_${randomPostfix}.mrc`;
    const uploadedFileName = `AT_C353602_autotestFile_${randomPostfix}.mrc`;
    const instanceIds = [];
    let user;

    before('Create test user, import a file with more than 100 records and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C353602_');

      DataImport.createMarcFile({
        fileName: marcFileName,
        records: Array.from({ length: recordsCount }, (_, index) => [
          {
            tag: '245',
            indicators: ['0', '0'],
            content: `$a AT_C353602_MarcBibInstance_${randomPostfix}_${index + 1}`,
          },
        ]),
      });

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        // The completed job with more than 100 records is created via API
        DataImport.uploadFileViaApi(
          marcFileName,
          uploadedFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          response.forEach(({ instance }) => {
            if (instance?.id) instanceIds.push(instance.id);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      instanceIds.forEach((instanceId) => InventoryInstance.deleteInstanceViaApi(instanceId));
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
    });

    it(
      'C353602 For Import jobs with more than 100 records, change from Load more to Paginated (promin)',
      { tags: ['extendedPath', 'promin', 'C353602'] },
      () => {
        // Step 1: Data Import landing page
        DataImport.waitLoading();

        // Step 2: Actions > View all logs - find the completed job with more than 100 records
        Logs.openViewAllLogs();
        LogsViewAll.searchWithTerm(uploadedFileName);
        LogsViewAll.verifyJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 3: Click the file name - log details with the number of records at the top
        LogsViewAll.openFileDetails(uploadedFileName);
        FileDetails.verifyHeader(uploadedFileName, recordsCount);

        // Step 4: Bottom of the page - Previous (disabled), 1-100, Next
        FileDetails.verifyPagination({
          range: [1, recordsPerPage],
          isPreviousDisabled: true,
          isNextDisabled: false,
        });

        // Steps 5-6: Next - Previous, 101-105; it is the last page, so Next is disabled
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyPagination({
          range: [recordsPerPage + 1, recordsCount],
          isPreviousDisabled: false,
          isNextDisabled: true,
        });

        // Step 7: Previous - the first page again, Previous is disabled
        FileDetails.clickPreviousPaginationButton();
        FileDetails.verifyPagination({
          range: [1, recordsPerPage],
          isPreviousDisabled: true,
          isNextDisabled: false,
        });
      },
    );
  });
});
