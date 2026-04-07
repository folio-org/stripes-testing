import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ITEM_STATUS_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = `H${getRandomLetters(7).toUpperCase()}`;
      const lcTypeCode = callNumbersIds[BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS];
      const instanceTitle = `AT_C387487_FolioInstance_${randomPostfix}`;
      const callNumbers = [
        {
          prefix: '',
          callNumber: `${randomLetters}PR9199.3 1920 .L33 1475 .A6`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PQ8550.21.R57 V5 1992`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PR919 .L33 1990`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PR9199.48 .B3`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PN2 .A6 1999`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PN2 .A6`,
          volume: 'v. 3',
          enumeration: 'no. 2',
          chronology: '1999',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PN2 .A69`,
          volume: '',
          enumeration: 'no. 2',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: 'Wordsworth',
          callNumber: `${randomLetters}PN2 .A69`,
          volume: '',
          enumeration: 'no. 2',
          chronology: '1922',
          copyNumber: '2',
          suffix: '',
        },
        {
          prefix: 'Over',
          callNumber: `${randomLetters}PN2 .A69`,
          volume: 'v.1',
          enumeration: 'no. 1',
          chronology: '',
          copyNumber: '',
          suffix: '+',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}PN2 .A69`,
          volume: '',
          enumeration: '',
          chronology: '1922',
          copyNumber: '',
          suffix: '',
        },
      ];
      const callNumberValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ` ${cn.suffix}` : ''}`,
      );
      const expectedOrder = [
        `${randomLetters}PN2 .A6`,
        `${randomLetters}PN2 .A6 1999 CD`,
        `${randomLetters}PN2 .A69`,
        `Wordsworth ${randomLetters}PN2 .A69`,
        `Over ${randomLetters}PN2 .A69 +`,
        `${randomLetters}PQ8550.21.R57 V5 1992`,
        `${randomLetters}PR919 .L33 1990`,
        `${randomLetters}PR9199.3 1920 .L33 1475 .A6`,
        `${randomLetters}PR9199.48 .B3`,
      ];
      const folioInstances = [];
      let location;
      let tempUser;
      let lcTypeId;

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C387487_');
        cy.then(() => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });

          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            lcTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS).id;

            folioInstances.push(
              InventoryInstances.generateFolioInstances({
                instanceTitlePrefix: instanceTitle,
                items: callNumbers.map((cn) => ({
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  itemLevelCallNumber: cn.callNumber,
                  itemLevelCallNumberTypeId: lcTypeId,
                  itemLevelCallNumberPrefix: cn.prefix,
                  itemLevelCallNumberSuffix: cn.suffix,
                  volume: cn.volume,
                  enumeration: cn.enumeration,
                  chronology: cn.chronology,
                  copyNumber: cn.copyNumber,
                })),
              })[0],
            );
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances,
              location,
            });
          })
          .then(() => {
            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
              tempUser = userProps;
            });
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
              callNumberTypes: [
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
              ],
            });
          })
          .then(() => {
            cy.login(tempUser.username, tempUser.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
            );
          });
      });

      after('Clean up', () => {
        cy.getAdminToken();
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [],
        });
        Users.deleteViaApi(tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      });

      it(
        'C387487 Call numbers are sorted by "LC" type when using "Library of Congress classification" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C387487'] },
        () => {
          callNumberValuesInApi.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber, true, lcTypeCode);
          });
          InventorySearchAndFilter.fillInBrowseSearch(expectedOrder[0]);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.valueInResultTableIsHighlighted(expectedOrder[0]);
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedOrder);
        },
      );
    });
  });
});
