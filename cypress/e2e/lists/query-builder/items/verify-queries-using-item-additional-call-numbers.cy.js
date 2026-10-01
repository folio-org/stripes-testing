import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_OPERATORS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';
import {
  CallNumberTypes,
  CALL_NUMBER_TYPES_DEFAULT,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

let user;
const instanceTitle = `AT_C844261_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  instanceId: null,
  deweyDecimalTypeId: null,
  lcModifiedTypeId: null,
  shelvingControlTypeId: null,
  itemBarcode: `item_${getRandomPostfix()}`,
  callNumber1: {
    callNumber: '170495a',
    prefix: 'call_Num_a.170495',
    suffix: '170495.call_Num_a',
    typeName: 'Dewey Decimal classification',
  },
  callNumber2: {
    callNumber: '170495b',
    prefix: 'call_Num_b.170495',
    suffix: '170495.call_Num_b',
    typeName: 'LC Modified',
  },
  callNumber3: {
    callNumber: '170495c',
    prefix: 'call_Num_c.170495',
    suffix: '170495.call_Num_c',
    typeName: 'Shelving control number',
  },
};
const listData = {
  name: `AT_C844261_List_${getRandomPostfix()}`,
  description: `AT_C844261_${getTestEntityValue('desc')}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C844261');

        // Get call number types
        CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
          testData.deweyDecimalTypeId = types.find(
            (t) => t.name === CALL_NUMBER_TYPES_DEFAULT.DEWEY_DECIMAL_CLASSIFICATION,
          )?.id;
          testData.lcModifiedTypeId = types.find(
            (t) => t.name === CALL_NUMBER_TYPES_DEFAULT.LC_MODIFIED,
          )?.id;
          testData.shelvingControlTypeId = types.find(
            (t) => t.name === CALL_NUMBER_TYPES_DEFAULT.SHELVING_CONTROL_NUMBER,
          )?.id;
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          testData.defaultLocation = res;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getDefaultMaterialType()
          .then((materialType) => {
            testData.materialTypeId = materialType.id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.defaultLocation.id,
                },
              ],
              items: [
                {
                  barcode: testData.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  additionalCallNumbers: [
                    {
                      callNumber: testData.callNumber1.callNumber,
                      prefix: testData.callNumber1.prefix,
                      suffix: testData.callNumber1.suffix,
                      typeId: testData.deweyDecimalTypeId,
                    },
                    {
                      callNumber: testData.callNumber2.callNumber,
                      prefix: testData.callNumber2.prefix,
                      suffix: testData.callNumber2.suffix,
                      typeId: testData.lcModifiedTypeId,
                    },
                    {
                      callNumber: testData.callNumber3.callNumber,
                      prefix: testData.callNumber3.prefix,
                      suffix: testData.callNumber3.suffix,
                      typeId: testData.shelvingControlTypeId,
                    },
                  ],
                },
              ],
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
            });
          })
          .then(() => {
            cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
              (userProperties) => {
                user = userProperties;

                cy.login(user.username, user.password, {
                  path: TopMenu.listsPath,
                  waiter: Lists.waitLoading,
                });
              },
            );
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C844261 Query Builder - Item — Item additional call numbers (athena)',
        { tags: ['criticalPath', 'athena', 'C844261'] },
        () => {
          // Step 1: Create new list with Items record type and build query
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.items);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Query by "Call number" equals "170495a"
          QueryModal.selectField(itemFieldValues.itemAdditionalCallNumbersCallNumber);
          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersCallNumber);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.callNumber1.callNumber);
          QueryModal.verifyTextFieldValue(testData.callNumber1.callNumber);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.selectCheckboxInShowColumns(itemFieldValues.itemBarcode);

          // Verify item with all three call number details
          QueryModal.verifyAdditionalCallNumbersEmbeddedTableInQueryModal(testData.itemBarcode, [
            {
              callNumber: testData.callNumber1.callNumber,
              prefix: testData.callNumber1.prefix,
              suffix: testData.callNumber1.suffix,
              type: testData.callNumber1.typeName,
            },
            {
              callNumber: testData.callNumber2.callNumber,
              prefix: testData.callNumber2.prefix,
              suffix: testData.callNumber2.suffix,
              type: testData.callNumber2.typeName,
            },
            {
              callNumber: testData.callNumber3.callNumber,
              prefix: testData.callNumber3.prefix,
              suffix: testData.callNumber3.suffix,
              type: testData.callNumber3.typeName,
            },
          ]);

          // Step 3: Add new row
          QueryModal.addNewRow();
          QueryModal.verifyQueryAreaContent(
            `(items.additional_call_numbers[*]->call_number == ${testData.callNumber1.callNumber})`,
          );

          // Step 4: Query by "Prefix" contains "um_b.170495"
          QueryModal.selectField(itemFieldValues.itemAdditionalCallNumbersPrefix, 1);
          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersPrefix, 1);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.fillInValueTextfield('um_b.170495', 1);
          QueryModal.verifyTextFieldValue('um_b.170495', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify item with all three call number details
          QueryModal.verifyAdditionalCallNumbersEmbeddedTableInQueryModal(testData.itemBarcode, [
            {
              callNumber: testData.callNumber1.callNumber,
              prefix: testData.callNumber1.prefix,
              suffix: testData.callNumber1.suffix,
              type: testData.callNumber1.typeName,
            },
            {
              callNumber: testData.callNumber2.callNumber,
              prefix: testData.callNumber2.prefix,
              suffix: testData.callNumber2.suffix,
              type: testData.callNumber2.typeName,
            },
            {
              callNumber: testData.callNumber3.callNumber,
              prefix: testData.callNumber3.prefix,
              suffix: testData.callNumber3.suffix,
              type: testData.callNumber3.typeName,
            },
          ]);

          // Step 5: Add new row
          QueryModal.addNewRow();

          // Step 6: Query by "Suffix" contains "170495.c"
          QueryModal.selectField(itemFieldValues.itemAdditionalCallNumbersSuffix, 2);
          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersSuffix, 2);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS, 2);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS, 2);
          QueryModal.fillInValueTextfield('170495.c', 2);
          QueryModal.verifyTextFieldValue('170495.c', 2);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify item with all three call number details
          QueryModal.verifyAdditionalCallNumbersEmbeddedTableInQueryModal(testData.itemBarcode, [
            {
              callNumber: testData.callNumber1.callNumber,
              prefix: testData.callNumber1.prefix,
              suffix: testData.callNumber1.suffix,
              type: testData.callNumber1.typeName,
            },
            {
              callNumber: testData.callNumber2.callNumber,
              prefix: testData.callNumber2.prefix,
              suffix: testData.callNumber2.suffix,
              type: testData.callNumber2.typeName,
            },
            {
              callNumber: testData.callNumber3.callNumber,
              prefix: testData.callNumber3.prefix,
              suffix: testData.callNumber3.suffix,
              type: testData.callNumber3.typeName,
            },
          ]);

          // Step 7: Add new row
          QueryModal.addNewRow();

          // Step 8: Query by "Type" IN ["Dewey Decimal classification", "LC Modified"]
          QueryModal.selectField(itemFieldValues.itemAdditionalCallNumbersType, 3);
          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersType, 3);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 3);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 3);
          QueryModal.chooseFromValueMultiselect(testData.callNumber1.typeName, 3);
          QueryModal.chooseFromValueMultiselect(testData.callNumber2.typeName, 3);
          QueryModal.verifySelectedMultiselectValue(
            [testData.callNumber1.typeName, testData.callNumber2.typeName],
            3,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify item with all three call number details
          QueryModal.verifyAdditionalCallNumbersEmbeddedTableInQueryModal(testData.itemBarcode, [
            {
              callNumber: testData.callNumber1.callNumber,
              prefix: testData.callNumber1.prefix,
              suffix: testData.callNumber1.suffix,
              type: testData.callNumber1.typeName,
            },
            {
              callNumber: testData.callNumber2.callNumber,
              prefix: testData.callNumber2.prefix,
              suffix: testData.callNumber2.suffix,
              type: testData.callNumber2.typeName,
            },
            {
              callNumber: testData.callNumber3.callNumber,
              prefix: testData.callNumber3.prefix,
              suffix: testData.callNumber3.suffix,
              type: testData.callNumber3.typeName,
            },
          ]);

          // Step 9: Run query & save
          QueryModal.verifyQueryAreaContent(
            `(items.additional_call_numbers[*]->call_number == ${testData.callNumber1.callNumber}) AND (items.additional_call_numbers[*]->prefix contains um_b.170495) AND (items.additional_call_numbers[*]->suffix contains 170495.c) AND (items.additional_call_numbers[*]->call_number_type_id in [${testData.callNumber1.typeName}, ${testData.callNumber2.typeName}])`,
          );
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();

          // Step 10: Edit list → Edit query
          Lists.verifyListNameLabel(listData.name);
          Lists.openActions();
          Lists.verifyEditListButtonIsActive();
          Lists.editList();
          Lists.editQuery();
          QueryModal.exists();
          QueryModal.verifyQueryAreaContent(
            `(items.additional_call_numbers[*]->call_number == ${testData.callNumber1.callNumber}) AND (items.additional_call_numbers[*]->prefix contains um_b.170495) AND (items.additional_call_numbers[*]->suffix contains 170495.c) AND (items.additional_call_numbers[*]->call_number_type_id in [${testData.callNumber1.typeName}, ${testData.callNumber2.typeName}])`,
          );

          // Verify all fields are pre-populated
          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersCallNumber);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifyTextFieldValue(testData.callNumber1.callNumber);

          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersPrefix, 1);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS, 1);
          QueryModal.verifyTextFieldValue('um_b.170495', 1);

          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersSuffix, 2);
          QueryModal.verifySelectedOperator(STRING_OPERATORS.CONTAINS, 2);
          QueryModal.verifyTextFieldValue('170495.c', 2);

          QueryModal.verifySelectedField(itemFieldValues.itemAdditionalCallNumbersType, 3);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 3);
          QueryModal.verifySelectedMultiselectValue(
            [testData.callNumber1.typeName, testData.callNumber2.typeName],
            3,
          );

          QueryModal.testQueryDisabled(false);

          // Step 11: Test query and verify results persist
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify item with all three call number details
          QueryModal.verifyAdditionalCallNumbersEmbeddedTableInQueryModal(testData.itemBarcode, [
            {
              callNumber: testData.callNumber1.callNumber,
              prefix: testData.callNumber1.prefix,
              suffix: testData.callNumber1.suffix,
              type: testData.callNumber1.typeName,
            },
            {
              callNumber: testData.callNumber2.callNumber,
              prefix: testData.callNumber2.prefix,
              suffix: testData.callNumber2.suffix,
              type: testData.callNumber2.typeName,
            },
            {
              callNumber: testData.callNumber3.callNumber,
              prefix: testData.callNumber3.prefix,
              suffix: testData.callNumber3.suffix,
              type: testData.callNumber3.typeName,
            },
          ]);
        },
      );
    });
  });
});
