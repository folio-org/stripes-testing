import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Browse configuration checks', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitle = `AT_C387478_FolioInstance_${randomPostfix}`;
      const localTypeName = `AT_C387478_Local_${randomPostfix}`;

      const callNumberHoldings = [
        { callNumber: `${randomLetters} 305 H981`, typeName: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL },
        {
          callNumber: `${randomLetters} Z668.R360 1988`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        },
        {
          callNumber: `${randomLetters} WB 102.5 B5315 2018`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        },
        {
          callNumber: `${randomLetters} 364.15 Microfilm`,
          typeName: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        },
        {
          callNumber: `${randomLetters} T21.19:M54/2/2005`,
          typeName: CALL_NUMBER_TYPE_NAMES.SUDOC,
        },
        { callNumber: `${randomLetters} 338.56`, typeName: CALL_NUMBER_TYPE_NAMES.UDC },
        { callNumber: `${randomLetters} MyNr7890`, typeName: localTypeName },
        { callNumber: `${randomLetters} Local.324`, typeName: null },
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

      const browseExpectations = {
        [BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL]: [0, 1, 2, 3, 4, 5, 6, 7],
        [BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL]: [0],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS]: [1, 6],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE]: [2, 1],
        [BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME]: [3, 5],
        [BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS]: [4],
      };

      const folioInstances = [];
      let localTypeId;
      let user;
      let holdingsFolioSourceId;
      let location;
      let callNumberTypeIds;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C387478');
            CallNumberTypes.deleteCallNumberTypesLike('AT_C387478');

            CallNumberTypes.createCallNumberTypeViaApi({ name: localTypeName }).then((id) => {
              localTypeId = id;

              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsFolioSourceId = folioSource.id;
              });
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
              }).then((res) => {
                location = res;
              });
              CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                callNumberTypeIds = {};
                callNumberHoldings.forEach((entry) => {
                  if (entry.typeName) {
                    const found = res.find((t) => t.name === entry.typeName);
                    if (found) callNumberTypeIds[entry.typeName] = found.id;
                  }
                });
              });
            });
          })
          .then(() => {
            folioInstances.push(
              InventoryInstances.generateFolioInstances({
                instanceTitlePrefix: instanceTitle,
                holdings: callNumberHoldings.map((entry) => ({
                  id: uuid(),
                  callNumber: entry.callNumber,
                  ...(entry.typeName && { callNumberTypeId: callNumberTypeIds[entry.typeName] }),
                })),
              })[0],
            );

            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              sourceId: holdingsFolioSourceId,
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
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        Users.deleteViaApi(user.userId);
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localTypeId);
      });

      it(
        'C387478 Browse for call numbers of each type when all call numbers belong to same instance (different Holdings) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C387478'] },
        () => {
          // Wait for all call numbers to be indexed
          callNumberHoldings.forEach((item) => {
            BrowseCallNumber.waitForCallNumberToAppear(item.callNumber);
          });

          // Test each browse option
          Object.entries(browseExpectations).forEach(([browseOption, expectedIndices]) => {
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);

            callNumberHoldings.forEach((item, index) => {
              InventorySearchAndFilter.browseSearch(item.callNumber);
              if (expectedIndices.includes(index)) {
                BrowseCallNumber.valueInResultTableIsHighlighted(item.callNumber);
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
