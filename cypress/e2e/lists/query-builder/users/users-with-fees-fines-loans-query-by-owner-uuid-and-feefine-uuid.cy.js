import moment from 'moment';
import uuid from 'uuid';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { USERS_WITH_FEES_FINES_LOANS_FIELDS } from '../../../../support/constants/query-builder/usersWithFeeFinesLoansFields';
import QueryModal, {
  QUERY_OPERATIONS,
  stringStoresUuidButMillionOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import Checkout from '../../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Lists } from '../../../../support/fragments/lists/lists';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../../support/fragments/topMenu';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';

const listName = getTestEntityValue('C1453708_List');
const ownerA = UsersOwners.getDefaultNewOwner();
const ownerB = UsersOwners.getDefaultNewOwner();
const feeFineType1 = {};
const feeFineType2 = {};
const feeFineType3 = {};
const paymentMethod = {};
let servicePointId;
let sourceRecord;

const items = {
  user1: { instanceName: `AT_C1453708_Inst1_${getRandomPostfix()}`, barcode: getRandomPostfix() },
  user2: { instanceName: `AT_C1453708_Inst2_${getRandomPostfix()}`, barcode: getRandomPostfix() },
  user3: { instanceName: `AT_C1453708_Inst3_${getRandomPostfix()}`, barcode: getRandomPostfix() },
  user4: { instanceName: `AT_C1453708_Inst4_${getRandomPostfix()}`, barcode: getRandomPostfix() },
};

let loginUser;
let user1;
let user2;
let user3;
let user4;
const feeFineAccounts = {};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users with fees/fines, loans', () => {
      before('Create test data', () => {
        cy.getAdminToken();

        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        });

        // Create two owners
        UsersOwners.createViaApi(ownerA).then(({ id, owner }) => {
          ownerA.id = id;
          ownerA.name = owner;

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            feeFineType: `AT_FeeFine_1_${getRandomPostfix()}`,
            ownerId: id,
          }).then((charge) => {
            feeFineType1.id = charge.id;
            feeFineType1.name = charge.feeFineType;
          });

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            feeFineType: `AT_FeeFine_2_${getRandomPostfix()}`,
            ownerId: id,
          }).then((charge) => {
            feeFineType2.id = charge.id;
            feeFineType2.name = charge.feeFineType;
          });

          PaymentMethods.createViaApi(id).then(({ name, id: pmId }) => {
            paymentMethod.name = name;
            paymentMethod.id = pmId;
          });
        });

        UsersOwners.createViaApi(ownerB).then(({ id, owner }) => {
          ownerB.id = id;
          ownerB.name = owner;

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            feeFineType: `AT_FeeFine_3_${getRandomPostfix()}`,
            ownerId: id,
          }).then((charge) => {
            feeFineType3.id = charge.id;
            feeFineType3.name = charge.feeFineType;
          });
        });

        // Create login user with required permissions
        cy.createTempUser([]).then((userProperties) => {
          loginUser = userProperties;
          cy.assignCapabilitiesToExistingUser(
            userProperties.userId,
            [],
            [
              CapabilitySets.moduleListsManage,
              CapabilitySets.uiUsersView,
              CapabilitySets.uiUsersFeeFinesView,
              CapabilitySets.uiInventory,
            ],
          );
          UserEdit.addServicePointViaApi(servicePointId, userProperties.userId);
        });

        // Create 4 test users
        cy.createTempUser([]).then((u) => {
          user1 = u;
          UserEdit.addServicePointViaApi(servicePointId, u.userId);
        });
        cy.createTempUser([]).then((u) => {
          user2 = u;
          UserEdit.addServicePointViaApi(servicePointId, u.userId);
        });
        cy.createTempUser([]).then((u) => {
          user3 = u;
          UserEdit.addServicePointViaApi(servicePointId, u.userId);
        });
        cy.createTempUser([]).then((u) => {
          user4 = u;
          UserEdit.addServicePointViaApi(servicePointId, u.userId);
        });

        // Create inventory items for loans
        Object.values(items).forEach(({ instanceName, barcode }) => {
          InventoryInstances.createInstanceViaApi(instanceName, barcode);
        });

        cy.then(() => {
          cy.getAdminSourceRecord().then((adminSource) => {
            sourceRecord = adminSource;

            const makeAccount = (userId, ownerId, ownerName, feeFineId, feeFineName) => ({
              id: uuid(),
              ownerId,
              feeFineId,
              amount: 5.0,
              userId,
              feeFineType: feeFineName,
              feeFineOwner: ownerName,
              createdAt: servicePointId,
              dateAction: moment.utc().format(),
              source: sourceRecord,
              status: { name: 'Open' },
              paymentStatus: { name: 'Outstanding' },
            });

            // User1: FeeFine_1 (Owner A)
            const acc1 = makeAccount(
              user1.userId,
              ownerA.id,
              ownerA.name,
              feeFineType1.id,
              feeFineType1.name,
            );
            feeFineAccounts.user1 = acc1;
            NewFeeFine.createViaApi(acc1).then((id) => {
              feeFineAccounts.user1.accountId = id;
            });

            // User2: FeeFine_2 (Owner A)
            const acc2 = makeAccount(
              user2.userId,
              ownerA.id,
              ownerA.name,
              feeFineType2.id,
              feeFineType2.name,
            );
            feeFineAccounts.user2 = acc2;
            NewFeeFine.createViaApi(acc2).then((id) => {
              feeFineAccounts.user2.accountId = id;
            });

            // User3: FeeFine_3 (Owner B)
            const acc3 = makeAccount(
              user3.userId,
              ownerB.id,
              ownerB.name,
              feeFineType3.id,
              feeFineType3.name,
            );
            feeFineAccounts.user3 = acc3;
            NewFeeFine.createViaApi(acc3).then((id) => {
              feeFineAccounts.user3.accountId = id;
            });

            // Checkout items for open loans (all 4 users)
            [
              { user: user1, itemBarcode: items.user1.barcode },
              { user: user2, itemBarcode: items.user2.barcode },
              { user: user3, itemBarcode: items.user3.barcode },
              { user: user4, itemBarcode: items.user4.barcode },
            ].forEach(({ user, itemBarcode }) => {
              Checkout.checkoutItemViaApi({
                itemBarcode,
                servicePointId,
                userBarcode: user.barcode,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listName);
        Object.values(feeFineAccounts).forEach(({ accountId }) => {
          if (accountId) NewFeeFine.deleteFeeFineAccountViaApi(accountId);
        });
        [user1, user2, user3, user4, loginUser].forEach((u) => {
          if (u?.userId) Users.deleteViaApi(u.userId);
        });
        Object.values(items).forEach(({ barcode }) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode);
        });
        ManualCharges.deleteViaApi(feeFineType1.id);
        ManualCharges.deleteViaApi(feeFineType2.id);
        ManualCharges.deleteViaApi(feeFineType3.id);
        PaymentMethods.deleteViaApi(paymentMethod.id);
        UsersOwners.deleteViaApi(ownerA.id);
        UsersOwners.deleteViaApi(ownerB.id);
      });

      it(
        'C1453708 User can build and save a "Users with fees/fines, loans" list queried by fee/fine owner UUID and fee/fine UUID (athena)',
        { tags: ['extendedPath', 'athena', 'C1453708'] },
        () => {
          cy.login(loginUser.username, loginUser.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list with "Users with fees/fines, loans" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.usersWithFeeFineLoans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query", verify form opens
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Fee/Fine account — Owner UUID" equals Owner A UUID, test query; expect 2 records
          QueryModal.selectField(USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID);
          QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(ownerA.id);
          QueryModal.verifyTextFieldValue(ownerA.id);
          QueryModal.verifyQueryAreaContent(`(account.owner_id == ${ownerA.id})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          // User1 and User2 (Owner A) shown; User3 (Owner B) and User4 (no fee/fine) NOT shown
          QueryModal.verifyMatchedRecordsByIdentifier(
            user1.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            ownerA.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            user2.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            ownerA.id,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user3.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 4: Change to "in", add Owner B UUID; verify 3 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${ownerA.id},${ownerB.id}`);
          QueryModal.verifyQueryAreaContent(`(account.owner_id in (${ownerA.id}, ${ownerB.id}))`);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(3);
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 5: Verify "Fee/Fine account — Owner UUID" column values per user
          QueryModal.verifyMatchedRecordsByIdentifier(
            user1.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            ownerA.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            user2.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            ownerA.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            user3.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            ownerB.id,
          );

          // Step 6: Change to "is null/empty", False; verify 3 records (users with fee/fine accounts)
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('False');
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 7: Change value to True; verify no records (User4 has no fee/fine account)
          QueryModal.chooseValueSelect('True');
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled(false);

          // Step 8: Change field to "Fee/Fine account — Fee/fine UUID", equals FeeFine_1 UUID; verify 1 record
          QueryModal.selectField(USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID);
          QueryModal.verifySelectedField(
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
          );
          QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.PLACEHOLDER);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(feeFineType1.id);
          QueryModal.verifyTextFieldValue(feeFineType1.id);
          QueryModal.verifyQueryAreaContent(`(account.fee_fine_id == ${feeFineType1.id})`);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyNumberOfMatchedRecords(1);
          // Only User1 has FeeFine_1; Users 2, 3, 4 NOT shown
          QueryModal.verifyMatchedRecordsByIdentifier(
            user1.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
            feeFineType1.id,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user2.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user3.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 9: Change to "in", add FeeFine_3 UUID; verify 2 records (User1 and User3)
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${feeFineType1.id},${feeFineType3.id}`);
          QueryModal.verifyQueryAreaContent(
            `(account.fee_fine_id in (${feeFineType1.id}, ${feeFineType3.id}))`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyNumberOfMatchedRecords(2);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user2.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 10: Verify "Fee/Fine account — Fee/fine UUID" column values
          QueryModal.verifyMatchedRecordsByIdentifier(
            user1.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
            feeFineType1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            user3.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
            feeFineType3.id,
          );

          // Step 11: Change to equals FeeFine_3 UUID + add row Owner A UUID → no records (FeeFine_3 belongs to Owner B)
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(feeFineType3.id);
          QueryModal.addNewRow();
          QueryModal.selectField(USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(ownerA.id, 1);
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
          QueryModal.verifyQueryAreaContent(
            `(account.fee_fine_id == ${feeFineType3.id}) AND (account.owner_id == ${ownerA.id})`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled(false);

          // Step 12: Change FeeFine UUID to FeeFine_2; verify 1 record (User2 has FeeFine_2 + Owner A)
          QueryModal.fillInValueTextfield(feeFineType2.id);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            user2.barcode,
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
            feeFineType2.id,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user1.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user3.barcode);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(user4.barcode);

          // Step 13: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingToComplete(3000);
          Lists.verifyQuery(
            `account.fee_fine_id == ${feeFineType2.id}) AND (account.owner_id == ${ownerA.id}`,
          );

          // Step 14: Edit query via Actions → Edit list → Edit query; verify conditions preserved
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.FEE_FINE_UUID,
            0,
          );
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 0);
          QueryModal.verifyTextFieldValue(feeFineType2.id, 0);
          QueryModal.verifySelectedField(
            USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT.OWNER_UUID,
            1,
          );
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyTextFieldValue(ownerA.id, 1);
          QueryModal.verifyQueryAreaContent(
            `(account.fee_fine_id == ${feeFineType2.id}) AND (account.owner_id == ${ownerA.id})`,
          );

          // Step 15: Remove row 1 (Owner UUID), test and run query & save with only Fee/fine UUID condition
          QueryModal.clickGarbage(1);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.verifyQuery(`account.fee_fine_id == ${feeFineType2.id}`);
        },
      );
    });
  });
});
