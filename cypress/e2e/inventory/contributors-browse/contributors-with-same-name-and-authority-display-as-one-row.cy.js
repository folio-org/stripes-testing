import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      tag100: '100',
      tag700: '700',
      contributorName: `AT_C388531_MarcAuthority_${randomPostfix}`,
      instanceTitle: `AT_C388531_MarcBibInstance_${randomPostfix}`,
      user: {},
    };
    const authData = {
      prefix: getRandomLetters(10),
      hridStartsWith: `388531${randomNDigitNumber(8)}1`,
    };
    const precedingContributors = Array.from(
      { length: 5 },
      (_, i) => `AT_C388531_AAA_${i + 1}_${randomPostfix}`,
    );

    // Two separate 700 occurrences, both linked to the same MARC Authority record below
    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['1', '1'] },
      { tag: '700', content: '$a Field700_1', indicators: ['1', '\\'] },
      { tag: '700', content: '$a Field700_2', indicators: ['1', '\\'] },
    ];
    precedingContributors.forEach((contrib) => marcBibFields.push({ tag: '700', content: `$a ${contrib}`, indicators: ['1', '\\'] }));

    before('Create and link test data via API, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388531_');
      InventoryInstances.deleteFullInstancesByTitleViaApi('C388531_');

      cy.then(() => {
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (createdInstanceId) => {
            testData.instanceId = createdInstanceId;
          },
        );

        MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.hridStartsWith, [
          {
            tag: testData.tag100,
            content: `$a ${testData.contributorName}`,
            indicators: ['1', '\\'],
          },
        ]).then((createdAuthorityId) => {
          testData.authorityId = createdAuthorityId;
        });
      }).then(() => {
        // Link both "700" fields to the same MARC Authority record
        QuickMarcEditor.linkMarcRecordsViaApi({
          bibId: testData.instanceId,
          authorityIds: [testData.authorityId, testData.authorityId],
          bibFieldTags: [testData.tag700, testData.tag700],
          authorityFieldTags: [testData.tag100, testData.tag100],
          finalBibFieldContents: [
            `$a ${testData.contributorName}`,
            `$a ${testData.contributorName}`,
          ],
          bibFieldIndexes: [5, 6],
        });
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
        MarcAuthority.deleteViaAPI(testData.authorityId);
      });
    });

    it(
      'C388531 Verify that contributors with the same "Name", "Name type" and "authorityID" will display as one row (promin)',
      { tags: ['criticalPath', 'promin', 'C388531'] },
      () => {
        // Step 1: select "Browse" in the Search|Browse toggle
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();

        // Step 2: select "Contributors" from the browse option dropdown
        BrowseContributors.select();

        BrowseContributors.waitForContributorToAppear(testData.contributorName, true, true, 1);
        precedingContributors.forEach((contrib) => BrowseContributors.waitForContributorToAppear(contrib));

        // Step 3-4: search the contributor name - exactly one highlighted row is displayed,
        // with a MARC Authority icon to its left (both linked "700" fields collapse into one row)
        BrowseContributors.browse(testData.contributorName);
        BrowseContributors.checkValuePresentInSpecificRow(testData.contributorName, {
          rowIndex: 4,
          isPresent: false,
        });
        BrowseContributors.checkValuePresentInSpecificRow(testData.contributorName, {
          rowIndex: 5,
          isPresent: true,
        });
        BrowseContributors.checkValuePresentInSpecificRow(testData.contributorName, {
          rowIndex: 6,
          isPresent: false,
        });
        BrowseContributors.checkAuthorityIconAndValueDisplayed(testData.contributorName);
      },
    );
  });
});
