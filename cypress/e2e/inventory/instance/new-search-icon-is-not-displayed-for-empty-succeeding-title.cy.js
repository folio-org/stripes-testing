import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C496132 createAutotestFile${getRandomPostfix()}.mrc`,
      succeedingTitle: 'No value set-',
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
      'C496132 Check that new search icon is not displayed for empty Succeeding title (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifySucceedingTitle(testData.succeedingTitle);
        InstanceRecordView.verifySucceedingTitleSearchIconAbsent(testData.succeedingTitle);
      },
    );
  });
});
