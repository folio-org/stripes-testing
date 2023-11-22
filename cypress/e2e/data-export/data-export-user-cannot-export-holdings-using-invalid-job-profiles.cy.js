import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';

let user;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `validHoldingUUID_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('data-export: failed using  invalid job profile', () => {
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
  });

  it(
    'C350536 Negative: Verify that a user cannot EXPORT HOLDINGS using invalid job profile (Firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, devTeams.firebird] },
    () => {
      ExportFileHelper.uploadFile(holdingUUIDsFileName);
      ExportFileHelper.exportWithDefaultJobProfile(holdingUUIDsFileName);
      DataExportResults.verifyLastLog(holdingUUIDsFileName, 'Fail');
    },
  );
});
