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
      notProduceSubjectName: 'Test2',
      subjectNameForCreatedInstance: 'Library of Congress Subject Headings',
    };
    const marcFile = {
      filePath: 'marcBibFileForC584505.mrc',
      fileName: `C584505 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create user and login', () => {
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

    // after('Delete test data', () => {
    //   cy.getAdminToken();
    //   InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    //   Users.deleteViaApi(testData.user.userId);
    // });

    it(
      'C584506 Check filtering by folio Subject Source using multiple conditions (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584506'] },
      () => {
        // BrowseSubjects.searchBrowseSubjects(testData.notProduceSubjectName);
        // BrowseSubjects.verifyNonExistentSearchResult(testData.notProduceSubjectName);
        // BrowseSubjects.expandAccordion('Subject source');
        // BrowseSubjects.selectSubjectSource(testData.subjectNameForCreatedInstance);
        // BrowseSubjects.verifySearchValue(testData.subjectNameForCreatedInstance);
      },
    );
  });
});
