import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

// Call numbers to assign to items
const callNumberTestData = [
  {
    type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
    value: 'QS 40 .GA7 E69',
    suffix: '7698',
  },
  {
    type: CALL_NUMBER_TYPE_NAMES.SUDOC,
    value: 'L40.s:Oc7/6',
    suffix: '7698',
  },
  {
    type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
    value: 'PN4 .A07',
    suffix: '7698',
  },
  {
    type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
    value: '407.0698',
    suffix: '7698',
  },
  {
    type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
    value: 'Charles407698',
    suffix: 'D',
  },
  {
    type: CALL_NUMBER_TYPE_NAMES.LOCAL,
    value: 'local c407698',
    suffix: 'suff',
  },
];

callNumberTestData.forEach((row) => {
  row.effective = `${row.value}${row.suffix ? ' ' + row.suffix : ''}`;
});

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = { localCNtypeName: `AT_C407698_CNType_${getRandomPostfix()}` };
    const instance = { title: `AT_C407698_FolioInstance_${getRandomPostfix()}` };
    let callNumberTypeLocalId;
    let callNumberTypes;
    let holdingTypeId;
    let locationId;
    let loanTypeId;
    let materialTypeId;
    let instanceTypeId;
    let holdingId;

    const callNumberSettings = [
      {
        name: CALL_NUMBER_TYPE_NAMES.ALL,
        callNumberTypes: [],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, testData.localCNtypeName],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        callNumberTypes: [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        ],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
      },
      {
        name: CALL_NUMBER_TYPE_NAMES.SUDOC,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
      },
    ];

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('C407698');
          // Create Local call number type
          CallNumberTypes.createCallNumberTypeViaApi({ name: testData.localCNtypeName }).then(
            (id) => {
              callNumberTypeLocalId = id;

              callNumberSettings.forEach((setting) => {
                CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
              });
            },
          );
          // Get types and location info
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((res) => {
            instanceTypeId = res[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (res) => {
              locationId = res.id;
            },
          );
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryInstances.getCallNumberTypes({ limit: 100, query: 'source=system' }).then(
            (res) => {
              callNumberTypes = res;
            },
          );
        })
        .then(() => {
          // Create instance and holdings
          InventoryInstances.createFolioInstanceViaApi({
            instance: { instanceTypeId, title: instance.title },
            holdings: [{ holdingsTypeId: holdingTypeId, permanentLocationId: locationId }],
          }).then((instanceData) => {
            instance.id = instanceData.instanceId;
            holdingId = instanceData.holdingIds[0].id;
            // Create items for each call number type
            callNumberTestData.forEach((row) => {
              const typeId =
                row.type === CALL_NUMBER_TYPE_NAMES.LOCAL
                  ? callNumberTypeLocalId
                  : callNumberTypes.find((el) => el.name === row.type).id;
              ItemRecordNew.createViaApi({
                holdingsId: holdingId,
                itemBarcode: uuid(),
                materialTypeId,
                permanentLoanTypeId: loanTypeId,
                itemLevelCallNumberTypeId: typeId,
                itemLevelCallNumber: row.value,
                itemLevelCallNumberSuffix: row.suffix,
              });
            });
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      callNumberSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: setting.name,
          callNumberTypes: [],
        });
      });
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instance.title);
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(callNumberTypeLocalId);
    });

    it(
      'Verify that exact match result will be returned during browse for call number with suffix and specified Call number type (NLM, LC, Dewey) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C407698'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyBrowseOptions();

        // Step 1-6: Call numbers (all)
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        callNumberTestData.forEach((row) => {
          BrowseCallNumber.waitForCallNumberToAppear(row.effective);
          InventorySearchAndFilter.browseSearch(row.effective);
          BrowseCallNumber.valueInResultTableIsHighlighted(row.effective);
        });

        // Step 7: National Library of Medicine classification
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        );
        InventorySearchAndFilter.browseSearch(callNumberTestData[0].effective);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[0].effective);

        // Step 8: Library of Congress classification
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.browseSearch(callNumberTestData[2].effective);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[2].effective);

        // Step 9: Dewey Decimal classification
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.browseSearch(callNumberTestData[3].effective);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[3].effective);

        // Step 10: Other scheme
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        );
        InventorySearchAndFilter.browseSearch(callNumberTestData[4].effective);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[4].effective);

        // Step 11: Superintendent of Documents classification
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        );
        InventorySearchAndFilter.browseSearch(callNumberTestData[1].effective);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[1].effective);
      },
    );
  });
});
