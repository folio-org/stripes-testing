import permissions from '../../support/dictionary/permissions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import { APPLICATION_NAMES } from '../../support/constants';

let user;

const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};

const emptyFile = `autoTestEmptyFile${getRandomPostfix()}.cql`;

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
    ]).then((userProperties) => {
      user = userProperties;

      InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

      FileManager.createFile(`cypress/fixtures/${emptyFile}`, ' ');

      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
  });

  it(
    'C399097 Verify trigger Data export with an empty .cql file (firebird) (Taas)',
    { tags: ['firebird', 'extendedPath', 'C399097'] },
    () => {
      DataExportLogs.waitLoading();
      ExportFileHelper.uploadFile(emptyFile);
      SelectJobProfile.verifySelectJobPane();
      SelectJobProfile.verifyExistingJobProfiles();
      SelectJobProfile.verifySearchBox();
      SelectJobProfile.verifySearchButton(true);
      ExportFileHelper.exportWithDefaultJobProfile(
        emptyFile,
        'Default instances',
        'Instances',
        '.cql',
      );

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        const jobId = jobData.hrId;
        const resultFileName = `${emptyFile.replace('.cql', '')}-${jobData.hrId}.mrc`;

        DataExportResults.verifyFailedExportResultCells(
          resultFileName,
          0,
          jobId,
          user.username,
          'Default instances',
          true,
        );
        cy.getUserToken(user.username, user.password);

        SearchPane.findResultRowIndexByContent(user.username).then((rowIndex) => {
          DataExportResults.verifyFileNameIsDisabled(Number(rowIndex));
          DataExportResults.verifyErrorMessage(Number(rowIndex), emptyFile);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();
        });
      });
    },
  );
});
