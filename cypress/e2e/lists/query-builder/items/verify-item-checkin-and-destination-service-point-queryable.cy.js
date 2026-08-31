import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile, { itemCsvHeaders } from '../../../../support/fragments/lists/lists-file';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory/item';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import UserEdit from '../../../../support/fragments/users/userEdit';

let user;
let checkInUser;
const instanceTitle = `AT_C1259781_Instance_${getRandomPostfix()}`;
const testData = {
  instanceTypeId: null,
  holdingTypeId: null,
  loanTypeId: null,
  materialTypeId: null,
  defaultLocation: {},
  instanceId: null,
  holdingsId: null,
  servicePoint1: null,
  servicePoint2: null,
  servicePoint3: null,
  itemBarcodes: [
    `item1_${getRandomPostfix()}`,
    `item2_${getRandomPostfix()}`,
    `item3_${getRandomPostfix()}`,
  ],
  itemIds: [],
};
const listData = {
  name: `AT_C1259781_List_${getRandomPostfix()}`,
  description: `AT_C1259781_${getTestEntityValue('desc')}`,
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Items', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1259781');

        // Get existing default service points
        ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
          testData.servicePoint1 = sp1;
        });
        ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
          testData.servicePoint2 = sp2;
        });
        ServicePoints.getOnlineServicePointViaApi().then((sp3) => {
          testData.servicePoint3 = sp3;
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
            }).then((createdInstance) => {
              testData.instanceId = createdInstance.instanceId;
              testData.holdingsId = createdInstance.holdingIds[0].id;
            });
          })
          .then(() => {
            // Create 3 items using forEach loop
            testData.itemBarcodes.forEach((barcode) => {
              cy.createItem({
                barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: testData.holdingsId,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeId },
              });
            });
          })
          .then(() => {
            // Create user with check-in permissions for checking in items
            cy.createTempUser([Permissions.checkinAll.gui, Permissions.inventoryAll.gui]).then(
              (userProperties) => {
                checkInUser = userProperties;
                // Add all three service points to the user at once
                UserEdit.addServicePointViaApi(
                  testData.servicePoint1.id,
                  checkInUser.userId,
                  testData.servicePoint1.id,
                  [testData.servicePoint1.id, testData.servicePoint2.id, testData.servicePoint3.id],
                ).then(() => {
                  // Check in items to different service points using forEach
                  const checkInData = [
                    { barcode: testData.itemBarcodes[0], servicePoint: testData.servicePoint1 },
                    { barcode: testData.itemBarcodes[1], servicePoint: testData.servicePoint2 },
                    { barcode: testData.itemBarcodes[2], servicePoint: testData.servicePoint3 },
                  ];

                  checkInData.forEach(({ barcode, servicePoint }) => {
                    CheckInActions.checkinItemViaApi({
                      itemBarcode: barcode,
                      servicePointId: servicePoint.id,
                      checkInDate: new Date().toISOString(),
                    });
                  });
                });
              },
            );
          })
          .then(() => {
            // Set items in transit to different destination service points using forEach
            const inTransitData = [
              {
                barcode: testData.itemBarcodes[1],
                destinationServicePoint: testData.servicePoint2,
              },
              {
                barcode: testData.itemBarcodes[2],
                destinationServicePoint: testData.servicePoint3,
              },
            ];

            inTransitData.forEach(({ barcode, destinationServicePoint }) => {
              cy.getItems({ limit: 1, query: `"barcode"=="${barcode}"` }).then((item) => {
                cy.updateItemViaApi({
                  ...item,
                  status: { name: ITEM_STATUS_NAMES.IN_TRANSIT },
                  inTransitDestinationServicePointId: destinationServicePoint.id,
                });
              });
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
        Lists.deleteDownloadedFile(listData.name);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(checkInUser.userId);
      });

      it(
        'C1259781 Verify that Item checkin and destination service point available and queryable (athena)',
        { tags: ['criticalPath', 'athena', 'C1259781'] },
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

          // Add instance title filter for test isolation
          QueryModal.selectField(itemFieldValues.instanceTitle);
          QueryModal.verifySelectedField(itemFieldValues.instanceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(instanceTitle);
          QueryModal.verifyTextFieldValue(instanceTitle);
          QueryModal.addNewRow();

          // Step 2: Test "Last check in service point — Code" with NOT EQUAL TO operator
          QueryModal.selectField(itemFieldValues.lastCheckInServicePointCode, 1);
          QueryModal.verifySelectedField(itemFieldValues.lastCheckInServicePointCode, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield('Test1', 1);
          QueryModal.verifyTextFieldValue('Test1', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(itemFieldValues.itemBarcode);
          QueryModal.clickShowColumnsButton();

          // Verify all 3 items are returned
          const itemsToVerify = [
            { barcode: testData.itemBarcodes[0], servicePoint: testData.servicePoint1 },
            { barcode: testData.itemBarcodes[1], servicePoint: testData.servicePoint2 },
            { barcode: testData.itemBarcodes[2], servicePoint: testData.servicePoint3 },
          ];

          itemsToVerify.forEach(({ barcode, servicePoint }) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              barcode,
              itemFieldValues.lastCheckInServicePointCode,
              servicePoint.code,
            );
          });

          // Step 3: Change to "Last check in service point — Discovery display name" with NOT EQUAL TO
          QueryModal.selectField(itemFieldValues.lastCheckInServicePointDiscoveryDisplayName, 1);
          QueryModal.verifySelectedField(
            itemFieldValues.lastCheckInServicePointDiscoveryDisplayName,
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield('Test1', 1);
          QueryModal.verifyTextFieldValue('Test1', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);

          // Verify all 3 items are returned
          itemsToVerify.forEach(({ barcode, servicePoint }) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              barcode,
              itemFieldValues.lastCheckInServicePointCode,
              servicePoint.code,
            );
          });

          // Step 4: Change to "Last check in service point — Name" with IN operator
          QueryModal.selectField(itemFieldValues.lastCheckInServicePointName, 1);
          QueryModal.verifySelectedField(itemFieldValues.lastCheckInServicePointName, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.servicePoint1.name, 1);
          QueryModal.chooseFromValueMultiselect(testData.servicePoint2.name, 1);
          QueryModal.verifySelectedMultiselectValue(
            [testData.servicePoint1.name, testData.servicePoint2.name],
            1,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          // Verify the two checked-in items are returned
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes[0],
            itemFieldValues.lastCheckInServicePointName,
            testData.servicePoint1.name,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes[1],
            itemFieldValues.lastCheckInServicePointName,
            testData.servicePoint2.name,
          );
          // Item 2 should not be in results (not checked in to these service points)
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.itemBarcodes[2]);

          // Step 5: Change to "Destination service point — Code" with NOT EQUAL TO
          QueryModal.selectField(itemFieldValues.destinationServicePointCode, 1);
          QueryModal.verifySelectedField(itemFieldValues.destinationServicePointCode, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield('Test2', 1);
          QueryModal.verifyTextFieldValue('Test2', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);

          // Verify all 3 items are returned
          itemsToVerify.forEach(({ barcode, servicePoint }) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              barcode,
              itemFieldValues.lastCheckInServicePointCode,
              servicePoint.code,
            );
          });

          // Step 6: Change to "Destination service point — Discovery display name" with NOT EQUAL TO
          QueryModal.selectField(itemFieldValues.destinationServicePointDiscoveryDisplayName, 1);
          QueryModal.verifySelectedField(
            itemFieldValues.destinationServicePointDiscoveryDisplayName,
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.NOT_EQUAL, 1);
          QueryModal.fillInValueTextfield('Test2', 1);
          QueryModal.verifyTextFieldValue('Test2', 1);
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);

          // Verify all 3 items are returned
          itemsToVerify.forEach(({ barcode, servicePoint }) => {
            QueryModal.verifyMatchedRecordsByIdentifier(
              barcode,
              itemFieldValues.lastCheckInServicePointCode,
              servicePoint.code,
            );
          });

          // Step 7: Change to "Destination service point — Name" with IN operator
          QueryModal.selectField(itemFieldValues.destinationServicePointName, 1);
          QueryModal.verifySelectedField(itemFieldValues.destinationServicePointName, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.servicePoint2.name, 1);
          QueryModal.chooseFromValueMultiselect(testData.servicePoint3.name, 1);
          QueryModal.verifySelectedMultiselectValue(
            [testData.servicePoint2.name, testData.servicePoint3.name],
            1,
          );
          QueryModal.clickTestQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);

          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes[1],
            itemFieldValues.destinationServicePointName,
            testData.servicePoint2.name,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes[2],
            itemFieldValues.destinationServicePointName,
            testData.servicePoint3.name,
          );

          // Step 8: Run query & save
          QueryModal.runQueryDisabled(false);
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listData.name);
          Lists.waitForCompilingToComplete();

          // Step 9: View updated list and display service point columns
          Lists.verifyListNameLabel(listData.name);
          Lists.openActions();
          Lists.verifyEditListButtonIsActive();

          // Show all 6 service point columns
          Lists.uncheckAllSelectedColumns();

          const servicePointColumns = [
            itemFieldValues.lastCheckInServicePointCode,
            itemFieldValues.lastCheckInServicePointDiscoveryDisplayName,
            itemFieldValues.lastCheckInServicePointName,
            itemFieldValues.destinationServicePointCode,
            itemFieldValues.destinationServicePointDiscoveryDisplayName,
            itemFieldValues.destinationServicePointName,
          ];

          servicePointColumns.forEach((column) => {
            Lists.selectResultColumn(column);
            Lists.verifyResultColumnDisplayed(column);
          });

          // Step 10: Export selected columns (CSV) and verify
          Lists.exportListVisibleColumns();
          Lists.verifyListExportGeneratedCalloutMessage(listData.name);
          Lists.verifyListExportedCalloutMessage(listData.name);

          // Verify CSV file contains only the checked column headers
          Lists.checkDownloadedFile(
            listData.name,
            `"${itemCsvHeaders.lastCheckInServicePointCode}","${itemCsvHeaders.lastCheckInServicePointDiscoveryDisplayName}","${itemCsvHeaders.lastCheckInServicePointName}","${itemCsvHeaders.destinationServicePointCode}","${itemCsvHeaders.destinationServicePointDiscoveryDisplayName}","${itemCsvHeaders.destinationServicePointName}"`,
          );

          // Verify CSV file contains the expected service point columns and values
          const servicePointsForCsvVerification = [testData.servicePoint3, testData.servicePoint2];

          servicePointsForCsvVerification.forEach((servicePoint) => {
            ListsFile.verifyHeaderAndValuesInCsvFileByIdentifier(
              listData.name,
              itemCsvHeaders.lastCheckInServicePointCode,
              servicePoint.code,
              [
                {
                  header: itemCsvHeaders.lastCheckInServicePointCode,
                  value: servicePoint.code,
                },
                {
                  header: itemCsvHeaders.lastCheckInServicePointDiscoveryDisplayName,
                  value: servicePoint.discoveryDisplayName,
                },
                {
                  header: itemCsvHeaders.lastCheckInServicePointName,
                  value: servicePoint.name,
                },
                {
                  header: itemCsvHeaders.destinationServicePointCode,
                  value: servicePoint.code,
                },
                {
                  header: itemCsvHeaders.destinationServicePointDiscoveryDisplayName,
                  value: servicePoint.discoveryDisplayName,
                },
                {
                  header: itemCsvHeaders.destinationServicePointName,
                  value: servicePoint.name,
                },
              ],
            );
          });
        },
      );
    });
  });
});
