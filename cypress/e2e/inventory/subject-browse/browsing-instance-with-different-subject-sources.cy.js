import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const subjectValue = `AT_C584543_TopicalTerm_${randomPostfix}`;
    const lcshSource = 'Library of Congress Subject Headings';
    const meshSource = 'Medical Subject Headings';
    const topicalTermType = 'Topical term';
    const keywordSearchOption = searchInstancesOptions[0]; // Keyword
    const precedingSubjectPrefix = 'AT_C584543_PrecedingSubject_';

    const testData = {
      user: {},
      instanceId1: null,
      instanceId2: null,
    };

    const marcBibFields1 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584543_MarcBibInstance_1_${randomPostfix}`,
        indicators: ['1', '1'],
      },
      // 2nd indicator 0 = Library of Congress Subject Headings; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValue}`, indicators: ['\\', '0'] },
      // preceding subjects to make sure target subject is on line 6
      { tag: '600', content: `$a ${precedingSubjectPrefix}1`, indicators: ['\\', '0'] },
      { tag: '600', content: `$a ${precedingSubjectPrefix}2`, indicators: ['\\', '0'] },
      { tag: '600', content: `$a ${precedingSubjectPrefix}3`, indicators: ['\\', '0'] },
      { tag: '600', content: `$a ${precedingSubjectPrefix}4`, indicators: ['\\', '0'] },
      { tag: '600', content: `$a ${precedingSubjectPrefix}5`, indicators: ['\\', '0'] },
    ];

    const marcBibFields2 = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      {
        tag: '245',
        content: `$a AT_C584543_MarcBibInstance_2_${randomPostfix}`,
        indicators: ['1', '1'],
      },
      // 2nd indicator 2 = Medical Subject Headings; tag 650 = Topical term
      { tag: '650', content: `$a ${subjectValue}`, indicators: ['\\', '2'] },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C584543_');
      cy.then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields1).then(
          (instanceId) => {
            testData.instanceId1 = instanceId;
          },
        );
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields2).then(
          (instanceId) => {
            testData.instanceId2 = instanceId;
          },
        );
      }).then(() => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId1);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId2);
    });

    it(
      'C584543 Browsing the instance with different subject sources (promin)',
      { tags: ['extendedPath', 'promin', 'C584543'] },
      () => {
        // Step 1-3: Navigate to Inventory, switch to Browse, select Subject option
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordSearchOption);
        BrowseSubjects.waitForSubjectToAppear(subjectValue, { quantity: 2 });
        for (let i = 1; i <= 5; i++) {
          BrowseSubjects.waitForSubjectToAppear(`${precedingSubjectPrefix}${i}`);
        }

        // Step 4: Search by subject value; verify 2 rows with same Subject/type but different sources
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        BrowseSubjects.select();
        BrowseSubjects.browse(subjectValue);
        BrowseSubjects.checkValueIsBold(subjectValue);
        BrowseSubjects.verifyDuplicateSubjectsWithDifferentSources({
          name: subjectValue,
          source: lcshSource,
          type: topicalTermType,
        });
        BrowseSubjects.verifyDuplicateSubjectsWithDifferentSources({
          name: subjectValue,
          source: meshSource,
          type: topicalTermType,
        });
      },
    );
  });
});
