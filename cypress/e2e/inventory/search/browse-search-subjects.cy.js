import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Subject Browse', () => {
  const testData = {
    instanceTitle: `instanceName-${getRandomPostfix()}`,
    subjectName: `subject-${getRandomPostfix()}`,
    barcode: `barcode-${getRandomPostfix()}`,
  };

  before('create test data', () => {
    const instanceId = InventoryInstances.createInstanceViaApi(
      testData.instanceTitle,
      testData.barcode,
    );
    cy.getInstanceById(instanceId).then((body) => {
      const requestBody = body;
      requestBody.subjects = [{ value: testData.subjectName }];
      cy.updateInstance(requestBody);
    });

    cy.createTempUser([permissions.uiSubjectBrowse.gui]).then((userProperties) => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
    Users.deleteViaApi(testData.userId);
  });

  it(
    'C350420 Verify Browse Subjects field data validation (spitfire) (TaaS)',
    { tags: [testTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseSubjects.searchBrowseSubjects(testData.subjectName);
      BrowseSubjects.checkRowValueIsBold(5, testData.subjectName);
      InventorySearchAndFilter.clickResetAllButton();
      InventorySearchAndFilter.verifySearchButtonDisabled();
      InventorySearchAndFilter.switchToSearchTab();
      InventorySearchAndFilter.selectSearchOptions('Subject', testData.subjectName);
      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle, true);
    },
  );
});
