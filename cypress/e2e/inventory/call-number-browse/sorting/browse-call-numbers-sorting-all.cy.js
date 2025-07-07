import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../support/constants';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const instanceTitlePrefix = `AT_C477566_FolioInstance_${randomPostfix}`;
    const testData = { user: {} };
    const callNumberBase = 'QD477 .M566';
    const callNumberEndings = [
      `${randomDigits}1`,
      `${randomDigits}2`,
      `${randomDigits}3`,
      `${randomDigits}4`,
      `${randomDigits}5`,
      `${randomDigits}6`,
      `${randomDigits}7`,
      `${randomDigits}8`,
    ];
    const callNumberTypes = [
      CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
      CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
      'Local',
      CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
      CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
      CALL_NUMBER_TYPE_NAMES.SUDOC,
      CALL_NUMBER_TYPE_NAMES.MOYS,
      '', // No type selected
    ];
    const instanceIds = [];
    const holdingsIds = [];
    let callNumberTypeIds = [];
    let locationId;
    let loanTypeId;
    let materialTypeId;
    let localTypeId;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477566');
      cy.then(() => {
        CallNumberTypes.createCallNumberTypeViaApi({
          name: `AT_C477566_Type_${randomPostfix}`,
        }).then((id) => {
          localTypeId = id;
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypeIds = callNumberTypes.map((type) => {
              if (!type) return undefined;
              if (type === 'Local') {
                return localTypeId;
              }
              const found = res.find((t) => t.name === type);
              if (found) return found.id;
              return undefined;
            });
          });
        });

        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialTypeId = res.id;
        });
      })
        .then(() => {
          for (let i = 0; i < 8; i++) {
            const instanceTitle = `${instanceTitlePrefix}_${i + 1}`;
            const instanceData = InventoryInstances.generateFolioInstances({
              instanceTitlePrefix: instanceTitle,
              holdingsCount: 1,
            })[0];
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: [instanceData],
              location: { id: locationId },
            }).then((createdInstance) => {
              instanceIds[i] = createdInstance.instanceId;
              holdingsIds[i] = createdInstance.holdings[0].id;
            });
          }
        })
        .then(() => {
          cy.getAdminToken();
          for (let i = 0; i < 8; i++) {
            ItemRecordNew.createViaApi({
              holdingsId: holdingsIds[i],
              materialTypeId,
              permanentLoanTypeId: loanTypeId,
              itemLevelCallNumber: `${callNumberBase} ${callNumberEndings[i]}`,
              itemLevelCallNumberTypeId: callNumberTypeIds[i],
            });
          }
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            testData.user = userProps;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            callNumberTypes: [],
          });
        });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(localTypeId);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    it(
      'C477566 Similar call numbers with different types selected are sorted alphabetically when used "Call numbers (all)" browse option (case 2) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C477566'] },
      () => {
        const expectedRows = callNumberEndings.map((num) => `${callNumberBase} ${num}`);
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        // Switch to Browse tab and select Call numbers (all)
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        BrowseCallNumber.waitForCallNumberToAppear(expectedRows[0]);
        InventorySearchAndFilter.fillInBrowseSearch(expectedRows[0]);
        InventorySearchAndFilter.clickSearch();
        // Verify the order and bolding
        BrowseCallNumber.valueInResultTableIsHighlighted(expectedRows[0]);
        BrowseCallNumber.resultRowsIsInRequiredOder(expectedRows);
      },
    );
  });
});
