import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Browse configuration checks', () => {
      const testData = {};
      const randomLetters = `C627499${getRandomLetters(7)}`;
      let callNumberTypes = null;
      const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
      const rnd = getRandomPostfix();
      const instancePrefix = `AT_C627499_FolioInstance_${rnd}`;
      const localCallNumberTypeName = `AT_C627499_LocalCNType_${rnd}`;
      const callNumbers = [
        { type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL, value: `627 499${randomLetters}` },
        {
          type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          value: `QS 62 .GA6 E27 2499${randomLetters}`,
        },
        {
          type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          value: `WA 627.4 B9627 2499${randomLetters}`,
        },
        { type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, value: `HEU/G27.4C99${randomLetters}` },
        {
          type: CALL_NUMBER_TYPE_NAMES.SUDOC,
          value: `L62.s:Oc2/7/499${randomLetters}`,
        },
        { type: CALL_NUMBER_TYPE_NAMES.UDC, value: `DD627.4 .B627 1499${randomLetters}` },
        { type: localCallNumberTypeName, value: `AT_C627499 Local ${randomLetters}` },
      ];
      const generateInstances = () => {
        return Array(callNumbers.length)
          .fill({})
          .map((_, i) => {
            return InventoryInstances.generateFolioInstances({
              instanceTitlePrefix: `${instancePrefix}_${i}`,
              itemsProperties: {
                itemLevelCallNumber: callNumbers[i].value,
                itemLevelCallNumberTypeId: getIdByName(callNumbers[i].type),
              },
            });
          })
          .flat();
      };

      let folioInstances = null;
      let location = null;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C627499');
            CallNumberTypes.deleteCallNumberTypesLike('AT_C627499').then(() => {
              CallNumberTypes.createCallNumberTypeViaApi({
                name: localCallNumberTypeName,
              }).then(() => {
                CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                  callNumberTypes = res;
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
            folioInstances = generateInstances();
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              location,
            });
          })
          .then(() => {
            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              testData.userId = userProperties.userId;

              CallNumberBrowseSettings.assignCallNumberTypesViaApi({
                name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
                callNumberTypes: [],
              });

              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C627499');
        CallNumberTypes.deleteCallNumberTypesLike('AT_C627499');
      });

      it(
        'C627499 Call number of each type could be found in the browse result list by "Dewey Decimal classification" browse option when browse config is empty (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C627499'] },
        () => {
          callNumbers.forEach((cn) => {
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
            );

            BrowseCallNumber.waitForCallNumberToAppear(cn.value);

            InventorySearchAndFilter.browseSearch(cn.value);
            BrowseCallNumber.valueInResultTableIsHighlighted(cn.value);

            InventorySearchAndFilter.clickResetAllButton();
            InventorySearchAndFilter.verifyBrowseResultListExists(false);
          });
        },
      );
    });
  });
});
