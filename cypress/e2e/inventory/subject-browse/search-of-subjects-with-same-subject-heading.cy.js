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
      subjectHeading: 'Test subject C584533',
      columnName: 'Subject source',
      subjectSources: ['Library of Congress Subject Headings', 'Canadian Subject Headings'],
      instanceIds: [],
    };
    const marcFile = {
      filePath: 'marcBibFileForC584533.mrc',
      fileName: `C584533 autotestFile${getRandomPostfix()}.mrc`,
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
      'C584533 Search of subjects with same subject heading (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584533'] },
      () => {
        BrowseSubjects.searchBrowseSubjects(testData.subjectHeading);
        cy.wait(5000);
        BrowseSubjects.expandAccordion('Subject source');
        testData.subjectSources.forEach((subjectSource) => {
          cy.wait(1000);
          BrowseSubjects.selectSubjectSource(subjectSource);
        });
        BrowseSubjects.verifySearchResult(testData.subjectSources, testData.columnName);
      },
    );
  });
});
