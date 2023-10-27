import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

describe('Subject Browse', () => {
  const testData = {
    subjectName: 'Rock music--1961-1970',
    instanceTitle: 'The Beatles in mono.',
  };

  before('create test data', () => {
    cy.createTempUser([permissions.uiSubjectBrowse.gui]).then((userProperties) => {
      testData.userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
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
