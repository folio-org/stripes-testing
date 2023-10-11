import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import SelectJobProfile from '../../support/fragments/data-export/selectJobProfile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';

let user;

const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};

const emptyFile = `autoTestEmptyFile${getRandomPostfix()}.cql`;

describe('data-export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.inventoryAll.gui, permissions.dataExportEnableApp.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);

        FileManager.createFile(`cypress/fixtures/${emptyFile}`, ' ');
      },
    );
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
  });

  it(
    'C399097 Verify trigger Data export with an empty .cql file (firebird) (Taas)',
    { tags: [devTeams.firebird, testTypes.extendedPath] },
    () => {
      DataExportLogs.waitLoading();
      ExportFileHelper.uploadFile(emptyFile);
      SelectJobProfile.verifySelectJobPane();
      SelectJobProfile.verifyExistingJobProfiles();
      SelectJobProfile.verifySearchBox();
      SelectJobProfile.verifySearchButton(true);
      ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'instances', 'Instances', '.cql');

      DataExportLogs.waitLoading();
      DataExportResults.verifyLastLog(emptyFile, 'Fail');
      DataExportResults.verifyFileNameIsDisabled(0);
      DataExportResults.verifyErrorMessage(0, emptyFile);
      TopMenuNavigation.navigateToApp('Data export');
      DataExportLogs.waitLoading();
    },
  );
});
