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
      notProduceSubjectName: 'Test49',
      firstConditionForFiltering: 'Corporate name',
      secondConditionForFiltering: 'Geographic name',
      columnName: 'Subject type',
    };
    const marcFile = {
      filePath: 'marcBibFileForC584509.mrc',
      fileName: `C584509 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
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

    after('Delete created test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C584509 Check filtering by folio Subject Type using multiple conditions (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584509'] },
      () => {
        BrowseSubjects.searchBrowseSubjects(testData.notProduceSubjectName);
        BrowseSubjects.verifyNonExistentSearchResult(testData.notProduceSubjectName);
        cy.wait(5000);
        BrowseSubjects.expandAccordion('Subject type');
        BrowseSubjects.selectSubjectType(testData.firstConditionForFiltering);
        BrowseSubjects.selectSubjectType(testData.secondConditionForFiltering);
        BrowseSubjects.verifySearchResult(
          [testData.firstConditionForFiltering, testData.secondConditionForFiltering],
          testData.columnName,
        );
      },
    );
  });
});
