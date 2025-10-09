import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      user: {},
      subjectHeading: 'Test54',
      columnName: 'Subject type',
      instanceIds: [],
    };
    const marcFile = {
      filePath: 'marcBibFileForC584530.mrc',
      fileName: `C584530 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        const preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(marcFile.filePath, marcFile.fileName, marcFile.jobProfile).then(
          (response) => {
            response.forEach((record) => {
              testData.instanceIds.push(record.instance.id);
            });
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

    after('Delete created instance', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C584530 Check pagination of subject filtering (folijet)',
      { tags: ['criticalPathFlaky', 'folijet', 'C584530'] },
      () => {
        const subjectTypes = ['Topical term', 'Geographic name', 'Personal name'];
        BrowseSubjects.searchBrowseSubjects(testData.subjectHeading);
        BrowseSubjects.verifyNonExistentSearchResult(testData.subjectHeading);
        BrowseSubjects.expandAccordion('Subject type');
        subjectTypes.forEach((subjectType) => {
          BrowseSubjects.selectSubjectType(subjectType);
          cy.wait(1000);
        });
        BrowseSubjects.verifySearchResult(subjectTypes, testData.columnName);
        BrowseSubjects.clickNextPaginationButton();
        BrowseSubjects.verifySearchResult(subjectTypes, testData.columnName);
        BrowseSubjects.clickPreviousPaginationButton();
        BrowseSubjects.verifySearchResult(subjectTypes, testData.columnName);
        cy.wait(2000);
      },
    );
  });
});
