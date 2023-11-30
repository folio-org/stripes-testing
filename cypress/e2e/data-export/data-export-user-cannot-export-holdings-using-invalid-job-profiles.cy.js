import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `instanceName_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('data-export', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.dataExportEnableModule.gui, permissions.inventoryAll.gui]).then(
      (userProperties) => {
        user = userProperties;
        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      },
    );
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  });

  it(
    'C350536 Negative: Verify that a user cannot EXPORT HOLDINGS using invalid job profile (Firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      ExportFileHelper.uploadFile(holdingUUIDsFileName);
      ExportFileHelper.exportWithDefaultJobProfile(holdingUUIDsFileName);
      DataExportResults.verifyLastLog(holdingUUIDsFileName, 'Fail');
    },
  );
});
