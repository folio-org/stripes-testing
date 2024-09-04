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
      filePath: 'marcBibFileForC496130.mrc',
      marcFileName: `C496130 createAutotestFile${getRandomPostfix()}.mrc`,
      instanceTitle: 'C496130 Liebigs Annalen der Chemie',
      succeedingTitle: 'C496130 Liebigs Annalen der Chemie',
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
        Users.deleteViaApi(testData.user.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });
    });

    it(
      'C496130 Check new search icon for Succeeding title with ISSN (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifySucceedingTitle(testData.succeedingTitle);
        InstanceRecordView.verifySucceedingTitleSearchIcon(testData.succeedingTitle);
        InstanceRecordView.succeedingTitlesIconClick();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.checkSearchQueryText(
          `title exactPhrase ${testData.succeedingTitle} and issn containsAll testISSN`,
        );
        InventoryInstances.verifySearchResultIncludingValue(testData.succeedingTitle);
      },
    );
  });
});
