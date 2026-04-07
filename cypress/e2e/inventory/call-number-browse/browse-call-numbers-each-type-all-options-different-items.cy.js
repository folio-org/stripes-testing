import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  ITEM_STATUS_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Browse configuration checks', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C387475_FolioInstance_${randomPostfix}`;
      const localTypeName = `AT_C387475_Local_${randomPostfix}`;
      let localTypeId;
      const folioInstances = [];

      const callNumberItems = [
        { callNumber: `${randomLetters} 304 H981`, typeName: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL },
        {
          callNumber: `${randomLetters} Z668.R360 1987`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        },
        {
          callNumber: `${randomLetters} WA 102.5 B5315 2010`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        },
        {
          callNumber: `${randomLetters} 364.15 Slater`,
          typeName: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        },
        { callNumber: `${randomLetters} T22.19:M54/2005`, typeName: CALL_NUMBER_TYPE_NAMES.SUDOC },
        { callNumber: `${randomLetters} 338.48`, typeName: CALL_NUMBER_TYPE_NAMES.UDC },
        { callNumber: `${randomLetters} MyNr123465`, typeName: localTypeName },
        { callNumber: `${randomLetters} Local.315`, typeName: null },
      ];

      const callNumberSettings = [
        { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, localTypeName],
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

      // Mapping: for each browse option, which callNumberItems indices should be found
      const browseExpectations = {
        [BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL]: [0, 1, 2, 3, 4, 5, 6, 7],
        [BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL]: [0],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS]: [1, 6],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE]: [2, 1],
        [BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME]: [3, 5],
        [BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS]: [4],
      };

      let location;
      let user;
      let callNumberTypeIds;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C387475');
            CallNumberTypes.deleteCallNumberTypesLike('AT_C387475');

            CallNumberTypes.createCallNumberTypeViaApi({ name: localTypeName }).then((id) => {
              localTypeId = id;

              CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                callNumberTypeIds = {};
                callNumberItems.forEach((item) => {
                  if (item.typeName) {
                    const found = res.find((t) => t.name === item.typeName);
                    if (found) callNumberTypeIds[item.typeName] = found.id;
                  }
                });

                folioInstances.push(
                  InventoryInstances.generateFolioInstances({
                    instanceTitlePrefix,
                    items: callNumberItems.map((item) => ({
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: item.callNumber,
                      ...(item.typeName && {
                        itemLevelCallNumberTypeId: callNumberTypeIds[item.typeName],
                      }),
                    })),
                  })[0],
                );
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
                authRefresh: true,
              });
              InventorySearchAndFilter.switchToBrowseTab();
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
        'C387475 Browse for call numbers of each type when all call numbers belong to same instance (different Items) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C387475'] },
        () => {
          // Wait for all call numbers to be indexed
          callNumberItems.forEach((item) => {
            BrowseCallNumber.waitForCallNumberToAppear(item.callNumber);
          });

          // Test each browse option
          Object.entries(browseExpectations).forEach(([browseOption, expectedIndices]) => {
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);

            callNumberItems.forEach((item, index) => {
              InventorySearchAndFilter.browseSearch(item.callNumber);
              if (expectedIndices.includes(index)) {
                BrowseCallNumber.valueInResultTableIsHighlighted(item.callNumber);
                BrowseCallNumber.checkValuePresentForRow(item.callNumber, 2, '1');
                BrowseCallNumber.checkValuePresentForRow(item.callNumber, 1, instanceTitlePrefix);
              } else {
                BrowseCallNumber.checkNonExactSearchResult(item.callNumber);
              }
            });
          });
        },
      );
    });
  });
});
