import uuid from 'uuid';
import moment from 'moment';
import Permissions from '../../../../support/dictionary/permissions';
import { LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS } from '../../../../support/constants/query-builder/lostItemsRequiringActualCostFields';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Checkout from '../../../../support/fragments/checkout/checkout';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import LostItemFeePolicy from '../../../../support/fragments/circulation/lost-item-fee-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C1282801_List_${getRandomPostfix()}`;
const instanceName = `AT_C1282801_FolioInstance_${getRandomPostfix()}`;
const itemBarcode = `barcode-${getRandomPostfix()}`;

const testData = {
  userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
};

const ownerBody = {
  owner: 'AutotestOwner' + getRandomPostfix(),
  servicePointOwner: [
    {
      value: testData.userServicePoint.id,
      label: testData.userServicePoint.name,
    },
  ],
};

const lostItemFeePolicy = {
  name: `ActualCostPolicy_${getRandomPostfix()}`,
  chargeAmountItem: {
    chargeType: 'actualCost',
    amount: 0.0,
  },
  lostItemProcessingFee: 0.0,
  chargeAmountItemPatron: true,
  chargeAmountItemSystem: true,
  returnedLostItemProcessingFee: false,
  replacedLostItemProcessingFee: false,
  replacementProcessingFee: 0.0,
  replacementAllowed: false,
  lostItemReturned: 'Charge',
  id: uuid(),
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Composite Entity Types', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
          testData.userServicePoint = servicePoint;

          Locations.getViaApiAnyDefault().then((location) => {
            testData.defaultLocation = location[0];

            testData.instanceId = InventoryInstances.createInstanceViaApi(
              instanceName,
              itemBarcode,
            );
            cy.getHoldings({ limit: 1, query: `"instanceId"="${testData.instanceId}"` }).then(
              (holdings) => {
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  permanentLocationId: testData.defaultLocation.id,
                });
              },
            );

            cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${itemBarcode}"` }).then(
              (res) => {
                testData.materialTypeId = res.materialType.id;
                testData.itemId = res.id;

                LostItemFeePolicy.createViaApi(lostItemFeePolicy);
                CirculationRules.addRuleViaApi(
                  { m: testData.materialTypeId },
                  { i: lostItemFeePolicy.id },
                ).then((newRule) => {
                  testData.addedRule = newRule;
                });
              },
            );

            UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
              testData.ownerId = ownerResponse.id;
            });

            cy.createTempUser([
              Permissions.listsEdit.gui,
              Permissions.uiUsersView.gui,
              Permissions.uiUserLostItemRequiringActualCost.gui,
            ]).then((userProperties) => {
              user = userProperties;

              UserEdit.addServicePointViaApi(testData.userServicePoint.id, user.userId);
              Checkout.checkoutItemViaApi({
                itemBarcode,
                userBarcode: user.barcode,
                servicePointId: testData.userServicePoint.id,
              });
              UserLoans.getUserLoansIdViaApi(user.userId).then((userLoans) => {
                UserLoans.declareLoanLostViaApi(
                  {
                    servicePointId: testData.userServicePoint.id,
                    declaredLostDateTime: moment.utc().format(),
                  },
                  userLoans.loans[0].id,
                );
              });

              cy.login(user.username, user.password, {
                path: TopMenu.listsPath,
                waiter: Lists.waitLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        CirculationRules.deleteRuleViaApi(testData.addedRule);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
        LostItemFeePolicy.deleteViaApi(lostItemFeePolicy.id);
        Users.deleteViaApi(user.userId);
        UsersOwners.deleteViaApi(testData.ownerId);
        Lists.deleteListByNameViaApi(listName);
      });

      it(
        'C1282801 Composite ET: Lost items requiring actual cost (athena)',
        { tags: ['criticalPath', 'athena', 'C1282801'] },
        () => {
          // Step 1: Click "New" button, enter list name, select "Lost items requiring actual cost" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.lostItemsRequiringActualCost);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click "Field" dropdown - verify field sources available
          QueryModal.verifyAllAvailableFieldOptions([
            ...Object.values(LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.ACTUAL_COST),
            ...Object.values(LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.ACTUAL_COST_CREATED_BY),
            ...Object.values(LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.ACTUAL_COST_UPDATED_BY),
            ...Object.values(LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.USER),
          ]);

          // Step 4: Build a query that returns at least 1 record
          QueryModal.selectField(LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.USER.BARCODE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(user.barcode);
          QueryModal.testQuery();

          // Verify precondition record is in results
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(1);
          Lists.verifyResultCellContains(
            0,
            LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.USER.BARCODE,
            user.barcode,
          );

          // Step 5: Click "Run query & save"
          Lists.runQueryAndSave();
          Lists.verifyListSavedCalloutMessage(listName);

          // Step 6: Wait for list refresh - verify toast and record count
          Lists.waitForCompilingToComplete();
          Lists.verifySingleRecordNumber();

          // Step 7: Verify record table displays based on query
          Lists.verifyResultCellContains(
            0,
            LOST_ITEMS_REQUIRING_ACTUAL_COST_FIELDS.USER.BARCODE,
            user.barcode,
          );
        },
      );
    });
  });
});
