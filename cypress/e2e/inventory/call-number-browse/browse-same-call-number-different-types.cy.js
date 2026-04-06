import { including } from '../../../../interactors';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import {
  ITEM_STATUS_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Browse configuration checks', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C627522_FolioInstance_${randomPostfix}`;
      const localTypeName = `AT_C627522_Local_${randomPostfix}`;
      const sameCallNumber = `${getRandomLetters(7)}${randomNDigitNumber(5)}. HD`;
      const callNumberBrowseCodeAll = callNumbersIds[BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL];
      const searchOption = 'Query search';

      // 8 instances with same call number but different types
      const instanceData = [
        { typeName: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL },
        { typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS },
        { typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE },
        { typeName: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME },
        { typeName: CALL_NUMBER_TYPE_NAMES.SUDOC },
        { typeName: CALL_NUMBER_TYPE_NAMES.UDC },
        { typeName: localTypeName },
        { typeName: null },
      ];

      const callNumberSettings = [
        { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
            localTypeName,
          ],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          ],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
        },
      ];

      // For each browse option, which instanceData indices should appear as highlighted rows
      const browseExpectations = {
        [BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL]: [0, 1, 2, 3, 4, 5, 6, 7],
        [BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL]: [0],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS]: [1, 2, 6],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE]: [2, 1],
        [BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME]: [3, 5],
        [BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS]: [4],
      };

      const folioInstances = [];
      let location;
      let user;
      let callNumberTypeIds;
      let localTypeId;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C627522');
            CallNumberTypes.deleteCallNumberTypesLike('AT_C627522');

            CallNumberTypes.createCallNumberTypeViaApi({ name: localTypeName }).then((id) => {
              localTypeId = id;

              CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                callNumberTypeIds = {};
                instanceData.forEach((data) => {
                  if (data.typeName) {
                    const found = res.find((t) => t.name === data.typeName);
                    if (found) callNumberTypeIds[data.typeName] = found.id;
                  }
                });

                instanceData.forEach((data, index) => {
                  folioInstances.push(
                    InventoryInstances.generateFolioInstances({
                      instanceTitlePrefix: `${instanceTitlePrefix}_${index + 1}`,
                      items: [
                        {
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          itemLevelCallNumber: sameCallNumber,
                          ...(data.typeName && {
                            itemLevelCallNumberTypeId: callNumberTypeIds[data.typeName],
                          }),
                        },
                      ],
                    })[0],
                  );
                });
              });
            });

            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
            }).then((res) => {
              location = res;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              location,
            });
          })
          .then(() => {
            callNumberSettings.forEach((setting) => {
              CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
            });

            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        callNumberSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            ...setting,
            callNumberTypes: [],
          });
        });
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localTypeId);
      });

      it(
        'C627522 Browse for call number which has the same value but different types (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C627522'] },
        () => {
          // Wait for call number to be indexed
          BrowseCallNumber.waitForCallNumberToAppear(
            sameCallNumber,
            true,
            callNumberBrowseCodeAll,
            undefined,
            instanceData.length,
          );

          // Test each browse option
          Object.entries(browseExpectations).forEach(([browseOption, expectedIndices]) => {
            const expectedCount = expectedIndices.length;
            const setting = callNumberSettings.find((s) => s.name === browseOption);
            const typeIds = setting.callNumberTypes
              .map((name) => callNumberTypeIds[name])
              .filter(Boolean);

            // Step: select browse option, search for call number
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);
            InventorySearchAndFilter.checkBrowseOptionSelected(browseOption);
            InventorySearchAndFilter.browseSearch(sameCallNumber);

            // Verify N rows are highlighted, each with "1" in Number of titles
            BrowseCallNumber.checkCallNumbersShown();
            BrowseCallNumber.checkResultsWithSameCallNumber(sameCallNumber, expectedCount, {
              isHighlighted: true,
              numberOfTitlesValues: Array(expectedCount).fill('1'),
            });

            // Step: click on the exact match result
            BrowseCallNumber.clickOnNthResultWithSameValue(sameCallNumber);

            // Verify redirected to Search with 'Query search' and correct query
            InventorySearchAndFilter.validateSearchTabIsDefault();
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOption);
            // Verify search query contains the call number and all expected type IDs
            InventorySearchAndFilter.checkSearchQueryText(
              including(`itemFullCallNumbers="${sameCallNumber}"`),
            );
            typeIds.forEach((id) => {
              InventorySearchAndFilter.checkSearchQueryText(
                including(`item.effectiveCallNumberComponents.typeId=="${id}"`),
              );
            });
            // Verify correct number of search results
            InventorySearchAndFilter.verifyNumberOfSearchResults(expectedCount);
            // Verify expected instance titles are displayed
            expectedIndices.forEach((idx) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(`${instanceTitlePrefix}_${idx + 1}`);
            });

            // Step: return to Browse tab
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            // Verify same results are still displayed
            BrowseCallNumber.checkResultsWithSameCallNumber(sameCallNumber, expectedCount, {
              isHighlighted: true,
              numberOfTitlesValues: Array(expectedCount).fill('1'),
            });
            InventorySearchAndFilter.clickResetAllButton();
            InventorySearchAndFilter.verifyBrowseResultListExists(false);
          });
        },
      );
    });
  });
});
