import { or } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      testValue: 'Physics projects.',
    };

    const fileName = `C350387 testMarcFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';

    const createdInstanceIDs = [];

    before('Creating user and instance', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi('marcFileForC350387.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdInstanceIDs.push(record[propertyName].id);
            });
          },
        );
      });

      cy.createTempUser([Permissions.uiSubjectBrowse.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Deleting user and instance', () => {
      cy.getAdminToken();
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.preconditionUserId);
    });

    it(
      'C350387 Verify the "Browse subjects" result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C350387', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.searchBrowseSubjects(testData.testValue);
        BrowseSubjects.checkSearchResultsTable();
        BrowseSubjects.checkResultAndItsRow(
          5,
          `${testData.testValue}would be hereNo value set-No value set-`,
        );
        BrowseSubjects.checkPaginationButtons({
          prev: { isVisible: true, isDisabled: false },
          next: { isVisible: true, isDisabled: or(true, false) },
        });

        BrowseSubjects.clickPreviousPaginationButton();
        BrowseSubjects.checkAbsenceOfResultAndItsRow(
          5,
          `${testData.testValue}would be hereNo value set-No value set-`,
        );

        BrowseSubjects.clickNextPaginationButton();
        BrowseSubjects.checkResultAndItsRow(
          5,
          `${testData.testValue}would be hereNo value set-No value set-`,
        );
      },
    );
  });
});
