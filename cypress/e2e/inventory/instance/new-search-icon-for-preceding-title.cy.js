import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      filePath: 'marcBibFileForC496125.mrc',
      marcFileName: `C496125 createAutotestFile${getRandomPostfix()}.mrc`,
      instanceTitle: 'C496125 Justus Liebigs Annalen der Chemie.',
      precedingTitle: 'C496125 Justus Liebigs Annalen der Chemie.',
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(
          testData.filePath,
          testData.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });
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
        Users.deleteViaApi(testData.preconditionUserId);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C496125 Check new search icon for Preceding title (folijet)',
      { tags: ['criticalPath', 'folijet', 'C496125'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyPrecedingTitle(testData.precedingTitle);
        InstanceRecordView.verifyPrecedingTitleSearchIcon(testData.precedingTitle);
        InstanceRecordView.precedingTitlesIconClick();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.checkSearchQueryText(
          `title exactPhrase ${testData.precedingTitle}`,
        );
        InventoryInstances.verifySearchResultIncludingValue(testData.precedingTitle);
        InventoryInstances.checkResultListSortedByColumn(1);
      },
    );
  });
});
