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
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
      FileManager.createFile(`cypress/fixtures/${emptyFile}`, ' ');
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

      DataExportLogs.waitLoading();
      DataExportResults.verifyLastLog(emptyFile, 'Fail');
      SearchPane.findResultRowIndexByContent(user.username).then((rowIndex) => {
        DataExportResults.verifyFileNameIsDisabled(Number(rowIndex));
        DataExportResults.verifyErrorMessage(Number(rowIndex), emptyFile);
      });
      TopMenuNavigation.navigateToApp('Data export');
      DataExportLogs.waitLoading();
    },
  );
});
