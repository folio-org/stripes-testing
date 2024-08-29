import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import DataImport from '../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Inventory', () => {
  const testData = {
    filePath: 'marcBibFileForC514901.mrc',
    marcFileName: `C514901 createAutotestFile${getRandomPostfix()}.mrc`,
  };

  before('Create test data and login', () => {
    cy.getAdminToken();
    DataImport.uploadFileViaApi(
      testData.filePath,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    ).then((response) => {
      testData.instanceId = response[0].instance.id;
    });

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C514901 Check MARC-MARC search query (folijet)',
    { tags: ['criticalPath', 'folijet'] },
    () => {
      InventoryInstances.verifyRecordsMatchingViaApi();
    },
  );
});
