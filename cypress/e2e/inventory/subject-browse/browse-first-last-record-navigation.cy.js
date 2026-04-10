import { or } from '@interactors/html';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      instanceName: `instanceName-${getRandomPostfix()}`,
      barcode: `barcode-${getRandomPostfix()}`,
      subjectName: `C356410 subject-${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiSubjectBrowse.gui]).then((userProperties) => {
        testData.user = userProperties;
      });

      const instanceId = InventoryInstances.createInstanceViaApi(
        testData.instanceName,
        testData.barcode,
      );
      cy.getInstanceById(instanceId).then((body) => {
        const requestBody = body;
        requestBody.subjects = [{ value: testData.subjectName }];
        cy.updateInstance(requestBody);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C356410 Verify first and last record navigation on Browse form (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C356410'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        // Step 1: Go to Inventory > Browse > Subjects; Search button is inactive
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifySearchButtonDisabled();

        // Step 2: Search for subject; Previous and Next buttons are displayed
        BrowseSubjects.searchBrowseSubjects(testData.subjectName);
        BrowseSubjects.checkPaginationButtons({
          prev: { isVisible: true, isDisabled: false },
          next: { isVisible: true, isDisabled: or(true, false) },
        });

        // Step 3: Click Previous; search field retains the entered value
        BrowseSubjects.navigateToFirstPage();
        BrowseSubjects.verifySearchValue(testData.subjectName);

        // Steps 4 & 5: Navigate to the first page; Previous is greyed out, Next is active
        BrowseSubjects.checkPaginationButtons({
          prev: { isVisible: true, isDisabled: true },
          next: { isVisible: true, isDisabled: false },
        });
        BrowseSubjects.verifySearchValue(testData.subjectName);

        // Step 6: Click Next; search field retains the entered value
        BrowseSubjects.clickNextPaginationButton();
        BrowseSubjects.verifySearchValue(testData.subjectName);

        // Step 7: Navigate to the last page; Next is greyed out, Previous is active
        BrowseSubjects.navigateToLastPage();
        BrowseSubjects.checkPaginationButtons({
          prev: { isVisible: true, isDisabled: false },
          next: { isVisible: true, isDisabled: true },
        });
      },
    );
  });
});
