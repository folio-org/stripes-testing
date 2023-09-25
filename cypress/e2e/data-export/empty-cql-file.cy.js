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

const validFile = `autoTestValidFile${getRandomPostfix()}.csv`;
const emptyFile = `autoTestEmptyFile${getRandomPostfix()}.cql`;

describe('Data-export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.inventoryAll.gui, permissions.dataExportEnableApp.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.dataExportPath);

        const instanceID = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );

        FileManager.createFile(`cypress/fixtures/${validFile}`, instanceID);
        FileManager.createFile(`cypress/fixtures/${emptyFile}`, ' ');

        ExportFileHelper.uploadFile(validFile);
        ExportFileHelper.exportWithDefaultJobProfile(validFile, 'instances', 'Instances', '.csv');
      },
    );
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${validFile}`);
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
      SelectJobProfile.verifySearchButton();
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
