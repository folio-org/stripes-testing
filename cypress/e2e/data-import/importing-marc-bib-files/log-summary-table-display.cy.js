import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathToUpload = 'marcBibFileForC353624.mrc';
    const fileName = `C356324 autotestFile${getRandomPostfix()}.mrc`;
    let instanceId;
    let user;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(filePathToUpload, fileName, jobProfileToRun).then(
          (response) => {
            instanceId = response[0].instance.id;
          },
        );

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C353624 Check the log summary table display (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C353624'] },
      () => {
        const columnNumbers = {
          summary: '1',
          srs: '2',
          instance: '3',
          holdings: '4',
          item: '5',
          authority: '6',
          order: '7',
          invoice: '8',
          error: '9',
        };

        Logs.openFileDetails(fileName);
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.summary, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.NO_ACTION,
          RECORD_STATUSES.ERROR,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.srs, ['103', '0', '0', '0']);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.instance, [
          '103',
          '0',
          '0',
          '0',
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.holdings, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.item, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.order, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.invoice, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
        ]);
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.error, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          '0',
        ]);
        FileDetails.clickNextPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyLogSummaryTableIsDisplayed();
        FileDetails.clickPreviousPaginationButton();
        FileDetails.verifyLogDetailsPageIsOpened(fileName);
        FileDetails.verifyLogSummaryTableIsDisplayed();
      },
    );
  });
});
