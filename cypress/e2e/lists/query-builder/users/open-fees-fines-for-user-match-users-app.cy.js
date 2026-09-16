import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS } from '../../../../support/constants/query-builder/feeFineAccountsWithUsersFields';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import UserAllFeesFines from '../../../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import PayFeeFine from '../../../../support/fragments/users/payFeeFine';
import WaiveFeeFineModal from '../../../../support/fragments/users/waiveFeeFineModal';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testCaseId = 'C1464069';
const listName = `AT_${testCaseId}_List_${getRandomPostfix()}`;

// Item barcodes for patron W's 5 fee/fine accounts
const itemBarcodes = {
  fee1: getRandomPostfix(), // Open
  fee2: getRandomPostfix(), // Open
  fee3: getRandomPostfix(), // Open
  fee4: getRandomPostfix(), // Closed (paid)
  fee5: getRandomPostfix(), // Closed (paid)
};

const owner = UsersOwners.getDefaultNewOwner();
const feeFineType = {};
const paymentMethod = {};
let servicePointId;
let sourceRecord;
let patronW;
let patronX;
const feeFineAccounts = {};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Users with fees/fines, loans', () => {
      before('Create test data', () => {
        cy.getAdminToken();

        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        });

        UsersOwners.createViaApi(owner).then(({ id, owner: ownerName }) => {
          owner.id = id;
          owner.name = ownerName;

          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: id,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
          });

          PaymentMethods.createViaApi(id).then(({ name, id: pmId }) => {
            paymentMethod.name = name;
            paymentMethod.id = pmId;
          });
        });

        // Create patron W (5 fee/fines: 3 open, 2 closed)
        cy.createTempUser([]).then((userProperties) => {
          patronW = userProperties;
          cy.assignCapabilitiesToExistingUser(
            userProperties.userId,
            [],
            [
              CapabilitySets.moduleListsManage,
              CapabilitySets.uiUsersView,
              CapabilitySets.uiUsersFeeFinesView,
              CapabilitySets.uiUsersFeeFineActionManage,
              CapabilitySets.uiInventory,
              CapabilitySets.circulationStorageManage,
              CapabilitySets.uiUsersManualPay,
            ],
          );
          UserEdit.addServicePointViaApi(servicePointId, userProperties.userId);
        });

        // Create patron X (2 open fee/fines)
        cy.createTempUser([]).then((userProperties) => {
          patronX = userProperties;
        });

        cy.then(() => {
          cy.getAdminSourceRecord().then((adminSource) => {
            sourceRecord = adminSource;

            const makeAccount = (userId, barcode, status = 'Open') => ({
              id: uuid(),
              ownerId: owner.id,
              feeFineId: feeFineType.id,
              amount: 5.0,
              userId,
              feeFineType: feeFineType.name,
              feeFineOwner: owner.name,
              createdAt: servicePointId,
              dateAction: moment.utc().format(),
              source: sourceRecord,
              barcode,
              status: { name: status },
              paymentStatus: { name: 'Outstanding' },
            });

            // Patron W: 3 open fee/fines (barcodes fee1–fee3)
            [itemBarcodes.fee1, itemBarcodes.fee2, itemBarcodes.fee3].forEach((barcode) => {
              const account = makeAccount(patronW.userId, barcode, 'Open');
              feeFineAccounts[barcode] = account;
              NewFeeFine.createViaApi(account).then((id) => {
                feeFineAccounts[barcode].accountId = id;
              });
            });

            // Patron W: fee4 closed by payment, fee5 closed by waive
            const closeAction = {
              [itemBarcodes.fee4]: (id, account) => PayFeeFine.payFeeFineViaApi(
                {
                  amount: account.amount,
                  paymentMethod: paymentMethod.id,
                  notifyPatron: false,
                  servicePointId,
                  userName: sourceRecord,
                },
                id,
              ),
              [itemBarcodes.fee5]: (id, account) => WaiveFeeFineModal.waiveFeeFineViaApi(
                {
                  amount: account.amount,
                  paymentMethod: paymentMethod.id,
                  notifyPatron: false,
                  servicePointId,
                  userName: sourceRecord,
                },
                id,
              ),
            };
            [itemBarcodes.fee4, itemBarcodes.fee5].forEach((barcode) => {
              const account = makeAccount(patronW.userId, barcode, 'Open');
              feeFineAccounts[barcode] = account;
              NewFeeFine.createViaApi(account).then((id) => {
                feeFineAccounts[barcode].accountId = id;
                closeAction[barcode](id, account);
              });
            });

            // Patron X: 2 open fee/fines
            [getRandomPostfix(), getRandomPostfix()].forEach((barcode) => {
              NewFeeFine.createViaApi(makeAccount(patronX.userId, barcode, 'Open'));
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Lists.deleteListByNameViaApi(listName);
        Object.values(feeFineAccounts).forEach(({ accountId }) => {
          if (accountId) NewFeeFine.deleteFeeFineAccountViaApi(accountId);
        });
        Users.deleteViaApi(patronW.userId);
        Users.deleteViaApi(patronX.userId);
        ManualCharges.deleteViaApi(feeFineType.id);
        PaymentMethods.deleteViaApi(paymentMethod.id);
        UsersOwners.deleteViaApi(owner.id);
      });

      it(
        'C1464069 Open fees/fines queried in the "Fee/Fine accounts with users" entity type match the open fees/fines displayed in the Users app (athena)',
        { tags: ['smoke', 'athena', 'C1464069'] },
        () => {
          cy.login(patronW.username, patronW.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });

          // Step 1: Create new list with "Fee/Fine accounts with users" record type
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.feeFineAccountsWithUsers);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query", verify form opens
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "User — Barcode" equals patron W barcode, test query; expect 5 records
          QueryModal.selectField(FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.USER.BARCODE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(patronW.barcode);
          QueryModal.verifyTextFieldValue(patronW.barcode);
          QueryModal.verifyQueryAreaContent(`(users.barcode == ${patronW.barcode})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(5);
          QueryModal.verifyNumberOfRowsInPreviewTable(5);
          // Patron X's fee/fines are NOT displayed
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(patronX.barcode);

          // Step 4: Add AND "Fee/Fine accounts — Status name" equals Open, test query; expect 3 records
          QueryModal.addNewRow();
          QueryModal.selectField(
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            1,
          );
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('Open', 1);
          QueryModal.verifyQueryAreaContent(
            `(users.barcode == ${patronW.barcode}) AND (account.status_name == Open)`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfMatchedRecords(3);
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.UUID,
          );
          QueryModal.clickShowColumnsButton();

          // Step 5: Verify status for the 3 open fee/fines using UUID as identifier
          QueryModal.verifyMatchedRecordsByIdentifier(
            feeFineAccounts[itemBarcodes.fee1].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            feeFineAccounts[itemBarcodes.fee2].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            feeFineAccounts[itemBarcodes.fee3].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          // Closed fee/fines are NOT displayed
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            feeFineAccounts[itemBarcodes.fee4].accountId,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            feeFineAccounts[itemBarcodes.fee5].accountId,
          );

          // Step 6: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(listName);
          Lists.waitForCompilingToComplete(3000);
          Lists.verifyQuery(
            `users.barcode == ${patronW.barcode}) AND (account.status_name == Open`,
          );

          // Step 7: Verify saved list contains exactly 3 records with open status
          Lists.verifyResultColumnDisplayed(
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.UUID,
          );
          Lists.verifyResultCellByIdentifier(
            feeFineAccounts[itemBarcodes.fee1].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          Lists.verifyResultCellByIdentifier(
            feeFineAccounts[itemBarcodes.fee2].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          Lists.verifyResultCellByIdentifier(
            feeFineAccounts[itemBarcodes.fee3].accountId,
            FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS.STATUS_NAME,
            'Open',
          );
          Lists.closeListDetailsPane();

          // Step 8: Navigate to Users app, search for patron W, verify Fees/Fines accordion
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByKeywords(patronW.barcode);
          UsersCard.waitLoading();
          UsersCard.openFeeFines(3, 2);

          // Step 9: Click the "3 open fees/fines" link, verify open fee/fines pane
          UsersCard.showOpenedFeeFines();
          UserAllFeesFines.verifyFeeFineCount(3);

          // Step 10: Click Closed tab, verify 2 closed fee/fines with correct barcodes
          UserAllFeesFines.goToClosedFeesFines();
          UserAllFeesFines.verifyFeeFineCount(2);

          // Step 11: Pay one open fee/fine (fee1) to close it; return to Lists app
          UserAllFeesFines.goToOpenFeeFines();
          UserAllFeesFines.clickPayEllipsis(0);
          PayFeeFine.setPaymentMethod(paymentMethod);
          PayFeeFine.submitAndConfirm();
          UserAllFeesFines.closeFeesFinesDetails();
          UsersCard.close();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
          Lists.waitLoading();
          Lists.openList(listName);
          // List still shows 3 records (snapshot, not yet refreshed)
          Lists.verifyRecordsNumber(3);

          // Step 12: Refresh list; verify 2 records remain after refresh
          Lists.openActions();
          Lists.refreshList();
          Lists.verifyRefreshCompleteCallout(2);
          Lists.viewUpdatedList();
          Lists.verifyRecordsNumber(2);

          // Step 13: Navigate to Users app, verify patron W now shows 2 open and 4 closed fees/fines
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersSearchPane.waitLoading();
          UsersSearchPane.searchByKeywords(patronW.barcode);
          UsersCard.waitLoading();
          UsersCard.openFeeFines(2, 3);
          UsersCard.verifyQuantityOfOpenAndClosedFeeFines(2, 3);
        },
      );
    });
  });
});
