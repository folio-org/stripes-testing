import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import SubjectTypes from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectTypeName = 'Corporate name';
    const nonExistentSearchTerm = `C380405_nonExistent_${randomPostfix}`;
    const testData = {
      user: {},
      instanceTitle: `AT_C584531_Instance_${randomPostfix}`,
      subjectValue: `AT_C584531_Subject_${randomPostfix}`,
      subjectTypeAccordionName: 'Subject type',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
        SubjectTypes.getSubjectTypesViaApi({ query: `name="${subjectTypeName}"` }).then(
          (subjectTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceType.id,
                title: testData.instanceTitle,
                subjects: [{ value: testData.subjectValue, typeId: subjectTypes[0].id }],
              },
            }).then(({ instanceId }) => {
              testData.instanceId = instanceId;
            });
          },
        );
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
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C584531 Check that filters remains the same after changing to search and back to browse (promin)',
      { tags: ['extendedPath', 'promin', 'C584531'] },
      () => {
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();

        // Step 1: search a term with no exact match - result list with the "would be here"
        // placeholder row is displayed at the position the term would appear
        BrowseSubjects.browse(nonExistentSearchTerm);
        BrowseSubjects.verifyNonExistentSearchResult(nonExistentSearchTerm);

        // Step 2: expand "Subject type" accordion
        BrowseSubjects.verifyAccordionStatusByName(testData.subjectTypeAccordionName, false);
        BrowseSubjects.expandAccordion(testData.subjectTypeAccordionName);
        BrowseSubjects.verifyAccordionStatusByName(testData.subjectTypeAccordionName, true);

        // Step 3-4: open "Subject type" dropdown, select an option
        BrowseSubjects.selectSubjectType(subjectTypeName);
        BrowseSubjects.verifySubjectTypeSelected(subjectTypeName);

        // Step 5: switch to "Search" toggle - Instance|Holdings|Item search page opens
        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.validateSearchTabIsDefault();

        // Step 6: perform any search there
        InventorySearchAndFilter.byKeywords('*');

        // Step 7: switch back to "Browse" toggle - filters from step 1 remain the same
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseSubjects.verifySearchValue(nonExistentSearchTerm);
        BrowseSubjects.verifyAccordionStatusByName(testData.subjectTypeAccordionName, false);
        BrowseSubjects.expandAccordion(testData.subjectTypeAccordionName);
        BrowseSubjects.verifyAccordionStatusByName(testData.subjectTypeAccordionName, true);
        BrowseSubjects.verifySubjectTypeSelected(subjectTypeName);
      },
    );
  });
});
