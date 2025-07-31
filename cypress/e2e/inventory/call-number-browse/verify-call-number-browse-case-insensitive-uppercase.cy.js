import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(7);
    const localCallNumberTypeName = `AT_C594363_Local_${randomPostfix}`;

    const callNumbers = [
      {
        type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        value: `${randomLetters.toUpperCase()}305.20973 T40`,
        valueLowerCase: `${randomLetters}305.20973 t40`,
        instanceTitle: `AT_C594363_Dewey_${randomPostfix}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        value: `${randomLetters.toUpperCase()}QC 981.8 .G56 G579`,
        valueLowerCase: `${randomLetters}qc 981.8 .g56 g579`,
        instanceTitle: `AT_C594363_LC_${randomPostfix}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        value: `${randomLetters.toUpperCase()}W1 BE 357 Bd. 1 1974`,
        valueLowerCase: `${randomLetters}w1 be 357 bd. 1 1974`,
        instanceTitle: `AT_C594363_NLM_${randomPostfix}`,
      },
      {
        type: localCallNumberTypeName,
        value: `${randomLetters.toUpperCase()}LOCAL1`,
        valueLowerCase: `${randomLetters}local1`,
        instanceTitle: `AT_C594363_Local_${randomPostfix}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        value: `${randomLetters.toUpperCase()}B OBAMA`,
        valueLowerCase: `${randomLetters}b obama`,
        instanceTitle: `AT_C594363_Other_${randomPostfix}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.SUDOC,
        value: `${randomLetters.toUpperCase()}Y 4.J 89/2-10:985`,
        valueLowerCase: `${randomLetters}y 4.j 89/2-10:985`,
        instanceTitle: `AT_C594363_SuDoc_${randomPostfix}`,
      },
      {
        type: null,
        value: `${randomLetters.toUpperCase()}TEST UPPER CASE`,
        valueLowerCase: `${randomLetters}test upper case`,
        instanceTitle: `AT_C594363_NoType_${randomPostfix}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.MOYS,
        value: `${randomLetters.toUpperCase()}MG 357 Ts. 1 1955`,
        valueLowerCase: `${randomLetters}mg 357 ts. 1 1955`,
        instanceTitle: `AT_C594363_MOYS_${randomPostfix}`,
      },
    ];

    const callNumberBrowseSettings = [
      { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, localCallNumberTypeName],
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

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          // Clean up any existing test data
          CallNumberTypes.deleteCallNumberTypesLike('C594363');
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C594363');

          // Create custom call number types
          CallNumberTypes.createCallNumberTypeViaApi({
            name: localCallNumberTypeName,
          }).then((id) => {
            testData.localCallNumberTypeId = id;
          });

          // Configure call number browse settings
          callNumberBrowseSettings.forEach((setting) => {
            CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
          });

          // Get system data
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
          }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
          });

          InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
            testData.callNumberTypes = res;
          });
        })
        .then(() => {
          // Create instances with items containing uppercase call numbers
          callNumbers.forEach((callNumberData) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: callNumberData.instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationId,
                },
              ],
            }).then((instanceIds) => {
              let callNumberTypeId = null;

              if (callNumberData.type) {
                if (callNumberData.type === localCallNumberTypeName) {
                  callNumberTypeId = testData.localCallNumberTypeId;
                } else {
                  callNumberTypeId = testData.callNumberTypes.find(
                    (el) => el.name === callNumberData.type,
                  ).id;
                }
              }

              ItemRecordNew.createViaApi({
                holdingsId: instanceIds.holdingIds[0].id,
                itemBarcode: uuid(),
                materialTypeId: testData.materialTypeId,
                permanentLoanTypeId: testData.loanTypeId,
                itemLevelCallNumberTypeId: callNumberTypeId,
                itemLevelCallNumber: callNumberData.value,
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      // Reset call number browse settings
      callNumberBrowseSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: setting.name,
          callNumberTypes: [],
        });
      });
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C594363');
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.localCallNumberTypeId);
    });

    it(
      'C594363 Verify that "Call number" browse is case-insensitive when call numbers are in Upper case (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C594363'] },
      () => {
        // Wait for all call numbers to appear in browse
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber.value);
        });

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);

        // Test cases for "Call numbers (all)" browse option
        const noTypeCallNumber = callNumbers.find((cn) => cn.type === null);

        // Step 1: Run browse for call number without selected type using lower case
        InventorySearchAndFilter.fillInBrowseSearch(noTypeCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(noTypeCallNumber.value);

        // Step 2: Run browse for call number without selected type using Upper case
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(noTypeCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(noTypeCallNumber.value);

        // Steps 3-16: Test call numbers with types using "Call numbers (all)" option
        const typedCallNumbers = callNumbers.filter((cn) => cn.type !== null);
        typedCallNumbers.forEach((callNumber) => {
          // Test lowercase search
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
          InventorySearchAndFilter.fillInBrowseSearch(callNumber.valueLowerCase);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber.value);

          // Test uppercase search
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
          InventorySearchAndFilter.fillInBrowseSearch(callNumber.value);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber.value);
        });

        // Steps 17-18: Test Dewey Decimal classification browse option
        const deweyCallNumber = callNumbers.find(
          (cn) => cn.type === CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        );
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.fillInBrowseSearch(deweyCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(deweyCallNumber.value);

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.fillInBrowseSearch(deweyCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(deweyCallNumber.value);

        // Steps 19-20: Test Library of Congress classification browse option
        const lcCallNumber = callNumbers.find(
          (cn) => cn.type === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(lcCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(lcCallNumber.value);

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(lcCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(lcCallNumber.value);

        // Steps 21-22: Test National Library of Medicine classification browse option
        const nlmCallNumber = callNumbers.find(
          (cn) => cn.type === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.fillInBrowseSearch(nlmCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(nlmCallNumber.value);

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.fillInBrowseSearch(nlmCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(nlmCallNumber.value);

        // Steps 23-24: Test Other scheme browse option
        const otherCallNumber = callNumbers.find(
          (cn) => cn.type === CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        );
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        InventorySearchAndFilter.fillInBrowseSearch(otherCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(otherCallNumber.value);

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        InventorySearchAndFilter.fillInBrowseSearch(otherCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(otherCallNumber.value);

        // Steps 25-26: Test Superintendent of Documents classification browse option
        const sudocCallNumber = callNumbers.find((cn) => cn.type === CALL_NUMBER_TYPE_NAMES.SUDOC);
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(sudocCallNumber.valueLowerCase);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(sudocCallNumber.value);

        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(sudocCallNumber.value);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(sudocCallNumber.value);
      },
    );
  });
});
