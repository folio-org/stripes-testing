import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
// import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
// import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      user: {},
      // notProduceSubjectName: 'Test45',
      // columnName: 'Subject source',
      // firstConditionForFiltering: 'Canadian Subject Headings',
      // secondConditionForFiltering: 'Library of Congress Subject Headings',
    };
    const marcFile = {
      filePath: 'marcBibFileForC584546.mrc',
      fileName: `C584546 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Import file', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        const preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(marcFile.filePath, marcFile.fileName, marcFile.jobProfile).then(
          (response) => {
            testData.instanceId = response[0].instance.id;
          },
        );
        cy.getAdminToken();
        Users.deleteViaApi(preconditionUserId);
      });
    });

    before('Create user and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.switchToBrowseTab();
      });
    });

    // after('Delete created instance', () => {
    //   cy.getAdminToken();
    //   Users.deleteViaApi(testData.user.userId);
    //   InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    // });

    it(
      'C584546 Browsing the multiple instances with different subject sources (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584546'] },
      () => {
        // BrowseSubjects.searchBrowseSubjects(testData.notProduceSubjectName);
        // BrowseSubjects.verifyNonExistentSearchResult(testData.notProduceSubjectName);
        // BrowseSubjects.expandAccordion('Subject source');
        // BrowseSubjects.selectSubjectSource(testData.firstConditionForFiltering);
        // BrowseSubjects.selectSubjectSource(testData.secondConditionForFiltering);
        // BrowseSubjects.verifySearchResult(
        //   [testData.firstConditionForFiltering, testData.secondConditionForFiltering],
        //   testData.columnName,
        // );
      },
    );
  });
});
