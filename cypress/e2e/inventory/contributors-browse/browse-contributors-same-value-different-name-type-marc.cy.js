import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C357986_MarcBibInstance_${randomPostfix}`;
    const instanceTitles = [
      `${instanceTitlePrefix}_First`,
      `${instanceTitlePrefix}_Second`,
      `${instanceTitlePrefix}_Third`,
    ];
    const contributorPrefix = `AT_C357986_Contributor_${randomPostfix}`;
    const contributorValues = [
      `${contributorPrefix}_FirstSet`,
      `${contributorPrefix}_SecondSet`,
      `${contributorPrefix}_ThirdSet`,
    ];
    const marcInstanceFieldsFirst = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${instanceTitles[0]}`,
        indicators: ['1', '1'],
      },
      {
        tag: '700',
        content: `$a ${contributorValues[0]}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '710',
        content: `$a ${contributorValues[1]}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '711',
        content: `$a ${contributorValues[2]}`,
        indicators: ['\\', '\\'],
      },
    ];
    const marcInstanceFieldsSecond = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${instanceTitles[1]}`,
        indicators: ['1', '1'],
      },
      {
        tag: '700',
        content: `$a ${contributorValues[1]}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '710',
        content: `$a ${contributorValues[0]}`,
        indicators: ['\\', '\\'],
      },
    ];
    const marcInstanceFieldsThird = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${instanceTitles[2]}`,
        indicators: ['1', '1'],
      },
      {
        tag: '700',
        content: `$a ${contributorValues[2]}`,
        indicators: ['\\', '\\'],
      },
      {
        tag: '711',
        content: `$a ${contributorValues[1]}`,
        indicators: ['\\', '\\'],
      },
    ];
    // After MSEARCH-426 is done, update recordIndexes to include only one index
    // ...for a record with exactly matching contributor value AND name type
    const searchData = [
      {
        contributor: contributorValues[0],
        nameTypes: ['Personal name', 'Corporate name'],
        nameTypeToSelect: 'Corporate name',
        recordIndexes: [0, 1],
      },
      {
        contributor: contributorValues[1],
        nameTypes: ['Personal name', 'Corporate name', 'Meeting name'],
        nameTypeToSelect: 'Meeting name',
        recordIndexes: [0, 2],
      },
      {
        contributor: contributorValues[2],
        nameTypes: ['Personal name', 'Meeting name'],
        nameTypeToSelect: 'Personal name',
        recordIndexes: [0, 2],
      },
    ];

    let user;
    const createdInstanceIds = [];

    before('Creating user and test data', () => {
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          InventoryInstances.deleteInstanceByTitleViaApi('AT_C357986');

          cy.then(() => {
            [marcInstanceFieldsFirst, marcInstanceFieldsSecond, marcInstanceFieldsThird].forEach(
              (fields) => {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
                  (instanceId) => {
                    createdInstanceIds.push(instanceId);
                  },
                );
              },
            );
          }).then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        },
      );
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C357986 [MARC] Verify that when user clicks on a contributor\'s name at browse result list, search for contributor also considers "Name type" value. (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C357986'] },
      () => {
        searchData.forEach(({ contributor, nameTypes, nameTypeToSelect, recordIndexes }, index) => {
          BrowseContributors.waitForContributorToAppear(contributor, true, false, nameTypes.length);
          InventorySearchAndFilter.selectBrowseContributors();

          if (index) {
            searchData[index - 1].nameTypes.forEach((nameType) => {
              BrowseContributors.checkSearchResultRow(
                searchData[index - 1].contributor,
                nameType,
                '',
                '1',
                true,
              );
            });
          }

          BrowseContributors.browse(contributor);
          nameTypes.forEach((nameType) => {
            BrowseContributors.checkSearchResultRow(contributor, nameType, '', '1', true);
          });

          BrowseContributors.openRecordWithValues(contributor, nameTypeToSelect);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.checkRowsCount(recordIndexes.length);
          recordIndexes.forEach((recordIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[recordIndex]);
          });
        });
      },
    );
  });
});
