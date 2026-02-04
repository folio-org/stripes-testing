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
    const numberOfInventory = 26;
    const randomPostfix = getRandomPostfix();
    const callNumberPrefix = 'PR47826.61 .B';
    const callNumberPostfix = getRandomLetters(7);
    const callNumbers = Array.from(
      { length: numberOfInventory - 1 },
      (_, i) => `${callNumberPrefix}${10 + i} ${callNumberPostfix}`,
    );
    callNumbers.push(`${callNumberPrefix}4 ${callNumberPostfix}`);
    const instanceTitlePrefix = `AT_C478261_FolioInstance_${randomPostfix}`;
    const queries = [
      callNumbers.at(-1),
      callNumbers[0],
      `${callNumberPrefix}432 ${callNumberPostfix}`,
      `${callNumberPrefix}0009 ${callNumberPostfix}`,
    ];

    let instanceTypeId;
    let location;
    let holdingsTypeId;
    let loanTypeId;
    let materialTypeId;
    let user;
    let callNumberTypeId;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C478261');

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
            holdingsTypeId = holdingTypes[0].id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
            materialTypeId = matType.id;
          });
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypeId = res.find(
              (type) => type.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            ).id;
          });
        })
        .then(() => {
          callNumbers.forEach((callNumber, i) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `${instanceTitlePrefix} ${i}`,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: location.id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                  itemLevelCallNumber: callNumber,
                  itemLevelCallNumberTypeId: callNumberTypeId,
                },
              ],
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.selectBrowseCallNumbers();
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C478261 Browse for call number which has (at least) 25 preceding call numbers with the same first 10 characters using "Call numbers (all)" browse option - LC type (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C478261'] },
      () => {
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);
        });

        queries.forEach((query, index) => {
          const isMatch = callNumbers.includes(query);
          let expectedCallNumbers;
          if (index === 0) expectedCallNumbers = callNumbers.slice(-6);
          else if (index === 2) expectedCallNumbers = callNumbers.slice(-5);
          else expectedCallNumbers = callNumbers;

          InventorySearchAndFilter.browseSearch(query);
          if (isMatch) BrowseCallNumber.valueInResultTableIsHighlighted(query);
          else BrowseCallNumber.checkNonExactSearchResult(query);
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedCallNumbers);
        });
      },
    );
  });
});
