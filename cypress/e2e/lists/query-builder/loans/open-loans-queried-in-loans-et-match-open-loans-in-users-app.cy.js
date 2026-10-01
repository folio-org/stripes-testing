import uuid from 'uuid';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { LOANS_FIELDS } from '../../../../support/constants/query-builder';
import { ITEM_STATUS_NAMES } from '../../../../support/constants/inventory';
import { APPLICATION_NAMES } from '../../../../support/constants';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import Checkout from '../../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UserEdit from '../../../../support/fragments/users/userEdit';

const testCaseId = 'C1464066';
const titlePrefix = `AT_${testCaseId}`;
const listData = {
  name: `${titlePrefix}_Open_loans_for_user`,
};
const testData = {
  loanPolicy: {
    name: `${titlePrefix}_LoanPolicy_${getRandomPostfix()}`,
    id: uuid.v4(),
  },
  patronU: {
    userId: null,
    barcode: null,
  },
  patronV: {
    userId: null,
    barcode: null,
  },
  itemBarcodes: {
    loan1: `${titlePrefix}_item1_${getRandomPostfix()}`,
    loan2: `${titlePrefix}_item2_${getRandomPostfix()}`,
    loan3: `${titlePrefix}_item3_${getRandomPostfix()}`,
    loan4: `${titlePrefix}_item4_${getRandomPostfix()}`,
    loan5: `${titlePrefix}_item5_${getRandomPostfix()}`,
    loan6: `${titlePrefix}_item6_${getRandomPostfix()}`,
    loan7: `${titlePrefix}_item7_${getRandomPostfix()}`,
    loan8: `${titlePrefix}_item8_${getRandomPostfix()}`,
    loan9: `${titlePrefix}_item9_${getRandomPostfix()}`,
  },
  materialType: null,
  circulationRule: null,
  owner: null,
  instances: [],
  loanIds: {},
};
let user;
let servicePoint;
let cachedLocation;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Loans', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        const createItemAndCheckout = ({ itemBarcode, userBarcode, instanceTitle }) => {
          const locationId = cachedLocation.id;

          return InventoryInstances.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            return InventoryInstances.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
              return InventoryInstances.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                return InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: instanceTitle,
                  },
                  holdings: [
                    {
                      holdingsTypeId: holdingTypes[0].id,
                      permanentLocationId: locationId,
                    },
                  ],
                  items: [
                    {
                      barcode: itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypes[0].id },
                      materialType: { id: testData.materialType.id },
                    },
                  ],
                }).then(({ instanceId }) => {
                  testData.instances.push(instanceId);

                  return Checkout.checkoutItemViaApi({
                    itemBarcode,
                    servicePointId: servicePoint.id,
                    userBarcode,
                  }).then((loan) => loan.id);
                });
              });
            });
          });
        };

        cy.getAdminToken()
          .then(() => InventoryInstances.getLocations({ limit: 1 }))
          .then((locations) => {
            cachedLocation = locations[0];
            return ServicePoints.getViaApi({
              limit: 1,
              query: `id=="${cachedLocation.primaryServicePoint}"`,
            });
          })
          .then((servicePoints) => {
            servicePoint = servicePoints[0];
            return cy.getBookMaterialType();
          })
          .then((bookMaterialType) => {
            testData.materialType = bookMaterialType;
            return LoanPolicy.createRenewableLoanPolicyApi(testData.loanPolicy);
          })
          .then(() => {
            return CirculationRules.addRuleViaApi(
              { m: testData.materialType.id },
              { l: testData.loanPolicy.id },
            );
          })
          .then((addedRule) => {
            testData.circulationRule = addedRule;
            const ownerData = UsersOwners.getDefaultNewOwner();
            return UsersOwners.createViaApi({
              ...ownerData,
              servicePointOwner: [{ value: servicePoint.id, label: servicePoint.name }],
            }).then((owner) => {
              testData.owner = owner;
            });
          })
          .then(() => {
            // Create Patron U
            return cy.createTempUser([]);
          })
          .then((createdUser) => {
            testData.patronU.userId = createdUser.userId;
            testData.patronU.barcode = createdUser.barcode;

            // Create Patron V
            return cy.createTempUser([]);
          })
          .then((createdUser) => {
            testData.patronV.userId = createdUser.userId;
            testData.patronV.barcode = createdUser.barcode;

            // Loan 1: checked out (open)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan1,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan1_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan1 = loanId;

            // Loan 2: checked out (open)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan2,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan2_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan2 = loanId;

            // Loan 3: checked out overdue (open) - same checkout process
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan3,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan3_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan3 = loanId;

            // Loan 4: will be declared lost
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan4,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan4_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan4 = loanId;

            // Loan 5: will be claimed returned
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan5,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan5_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan5 = loanId;

            // Loan 6: will be checked in (closed)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan6,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan6_${getRandomPostfix()}`,
            });
          })
          .then(() => {
            // Loan 7: will be claimed returned then marked missing (closed)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan7,
              userBarcode: testData.patronU.barcode,
              instanceTitle: `${titlePrefix}_Loan7_${getRandomPostfix()}`,
            });
          })
          .then((loanId) => {
            testData.loanIds.loan7 = loanId;

            // Patron V - Loan 8 (open)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan8,
              userBarcode: testData.patronV.barcode,
              instanceTitle: `${titlePrefix}_Loan8_${getRandomPostfix()}`,
            });
          })
          .then(() => {
            // Patron V - Loan 9 (open)
            return createItemAndCheckout({
              itemBarcode: testData.itemBarcodes.loan9,
              userBarcode: testData.patronV.barcode,
              instanceTitle: `${titlePrefix}_Loan9_${getRandomPostfix()}`,
            });
          })
          .then(() => {
            // Declare Loan 4 lost
            return UserLoans.declareLoanLostViaApi(
              { servicePointId: servicePoint.id },
              testData.loanIds.loan4,
            );
          })
          .then(() => {
            // Claim Loan 5 returned
            return UserLoans.claimItemReturnedViaApi({}, testData.loanIds.loan5);
          })
          .then(() => {
            // Check in Loan 6 (closed)
            return CheckInActions.checkinItemViaApi({
              itemBarcode: testData.itemBarcodes.loan6,
              servicePointId: servicePoint.id,
              checkInDate: new Date().toISOString(),
            });
          })
          .then(() => {
            // Claim Loan 7 returned, then mark as missing
            return UserLoans.claimItemReturnedViaApi({}, testData.loanIds.loan7);
          })
          .then(() => {
            return UserLoans.declareClaimedReturnedItemMissingViaApi({
              loanId: testData.loanIds.loan7,
            });
          })
          .then(() => {
            return cy.createTempUser([]).then((userProperties) => {
              user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                userProperties.userId,
                [],
                [
                  CapabilitySets.moduleListsManage,
                  CapabilitySets.uiUsersView,
                  CapabilitySets.uiInventory,
                  CapabilitySets.uiUsersLoansView,
                  CapabilitySets.circulationStorageManage,
                  CapabilitySets.uiCheckin,
                ],
              );
              UserEdit.addServicePointViaApi(servicePoint.id, userProperties.userId);

              cy.login(user.username, user.password, {
                path: TopMenu.listsPath,
                waiter: Lists.waitLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);

        if (testData.circulationRule) {
          CirculationRules.deleteRuleViaApi(testData.circulationRule);
        }

        testData.instances.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });

        if (testData.owner && testData.owner.id) {
          UsersOwners.deleteViaApi(testData.owner.id);
        }

        if (testData.loanPolicy && testData.loanPolicy.id) {
          LoanPolicy.deleteApi(testData.loanPolicy.id);
        }

        if (testData.patronU && testData.patronU.userId) {
          Users.deleteViaApi(testData.patronU.userId);
        }

        if (testData.patronV && testData.patronV.userId) {
          Users.deleteViaApi(testData.patronV.userId);
        }

        if (user && user.userId) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C1464066 Open loans queried in the "Loans" entity type match the open loans displayed in the Users app (athena)',
        { tags: ['smoke', 'athena', 'C1464066'] },
        () => {
          // Step 1: Click "New", enter list name, select "Loans" record type
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.selectRecordType(Lists.recordTypes.loans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query" button
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 3: Select "User — Barcode" = Patron U barcode, test query
          QueryModal.selectField(LOANS_FIELDS.USER.BARCODE);
          QueryModal.verifySelectedField(LOANS_FIELDS.USER.BARCODE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.patronU.barcode);
          QueryModal.verifyQueryAreaContent(`(users.barcode == ${testData.patronU.barcode})`);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Verify 7 Patron U loans returned, Patron V loans NOT displayed
          QueryModal.verifyNumberOfMatchedRecords(7);
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(LOANS_FIELDS.ITEM.BARCODE);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan1,
            LOANS_FIELDS.USER.BARCODE,
            testData.patronU.barcode,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan2,
            LOANS_FIELDS.USER.BARCODE,
            testData.patronU.barcode,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.itemBarcodes.loan8);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.itemBarcodes.loan9);

          // Step 4: Add second row "Loan — Status name" = "Open"
          QueryModal.addNewRow();
          QueryModal.selectField(LOANS_FIELDS.LOAN.STATUS_NAME, 1);
          QueryModal.verifySelectedField(LOANS_FIELDS.LOAN.STATUS_NAME, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifyOptionsInValueSelect(['Open', 'Closed'], 1);
          QueryModal.chooseValueSelect('Open', 1);

          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);

          // Verify 5 records returned (Loans 1-5); Loans 6 and 7 NOT shown
          QueryModal.verifyNumberOfMatchedRecords(5);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan1,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan2,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan3,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan4,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan5,
            LOANS_FIELDS.LOAN.STATUS_NAME,
            'Open',
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.itemBarcodes.loan6);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.itemBarcodes.loan7);

          // Step 5: Verify "Loan — Status name" = "Open" and "Item — Barcode" values
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan1,
            LOANS_FIELDS.ITEM.BARCODE,
            testData.itemBarcodes.loan1,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan2,
            LOANS_FIELDS.ITEM.BARCODE,
            testData.itemBarcodes.loan2,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan3,
            LOANS_FIELDS.ITEM.BARCODE,
            testData.itemBarcodes.loan3,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan4,
            LOANS_FIELDS.ITEM.BARCODE,
            testData.itemBarcodes.loan4,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.itemBarcodes.loan5,
            LOANS_FIELDS.ITEM.BARCODE,
            testData.itemBarcodes.loan5,
          );

          // Step 6: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);
            Lists.verifyRefreshCompleteCallout(recordCount);
            Lists.viewUpdatedList();
            Lists.verifyQuery(
              `users.barcode == ${testData.patronU.barcode}) AND (loans.status_name == Open`,
            );

            // Step 7: Verify saved list has 5 rows with correct barcodes and "Open" status
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan1,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan2,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan3,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan4,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan5,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan1,
              LOANS_FIELDS.ITEM.BARCODE,
              testData.itemBarcodes.loan1,
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan2,
              LOANS_FIELDS.ITEM.BARCODE,
              testData.itemBarcodes.loan2,
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan3,
              LOANS_FIELDS.ITEM.BARCODE,
              testData.itemBarcodes.loan3,
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan4,
              LOANS_FIELDS.ITEM.BARCODE,
              testData.itemBarcodes.loan4,
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan5,
              LOANS_FIELDS.ITEM.BARCODE,
              testData.itemBarcodes.loan5,
            );
            Lists.closeListDetailsPane();

            // Step 8: Navigate to Users app, find Patron U, expand Loans accordion
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
            UsersSearchPane.waitLoading();
            UsersSearchPane.searchByBarcode(testData.patronU.barcode);
            UsersSearchPane.selectUserFromList(testData.patronU.barcode);

            // Verify "5 open loans (1 claimed returned)" and "2 closed loans"
            UsersCard.expandLoansSection(5, 1);
            UsersCard.verifyQuantityOfOpenAndClaimReturnedLoans(5, 1);

            // Step 9: Click "5 open loans" hyperlink
            UsersCard.clickCurrentLoansLink();
            UserLoans.waitLoading();
            UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(5, 1);
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan1],
              testData.itemBarcodes.loan1,
            );
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan2],
              testData.itemBarcodes.loan2,
            );
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan3],
              testData.itemBarcodes.loan3,
            );
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan4, ITEM_STATUS_NAMES.DECLARED_LOST],
              testData.itemBarcodes.loan4,
            );
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan5, ITEM_STATUS_NAMES.CLAIMED_RETURNED],
              testData.itemBarcodes.loan5,
            );

            // Step 10: Click "Closed loans" tab
            UserLoans.showClosedLoans();
            UserLoans.verifyClosedLoansTabSelected();
            UserLoans.verifyNumberOfLoans(2);
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan6],
              testData.itemBarcodes.loan6,
            );
            UserLoans.checkResultsInTheRowByBarcode(
              [testData.itemBarcodes.loan7],
              testData.itemBarcodes.loan7,
            );
            UserLoans.closeLoansHistory();

            // Step 11: Check in item loan1, return to Lists app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
            CheckInActions.checkInItemGui(testData.itemBarcodes.loan1);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
            Lists.waitLoading();
            Lists.openList(listData.name);

            // Verify list still shows 5 records (snapshot not updated)
            Lists.verifyListsPaneRecordsCount(5);

            // Step 12: Click "Actions" > "Refresh list"
            Lists.openActions();
            Lists.refreshList();
            Lists.verifyRefreshCompleteCallout(4);
            Lists.viewUpdatedList();

            // Verify updated list shows 4 records, loan1 item NOT in list
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan2,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan3,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan4,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );
            Lists.verifyResultCellByIdentifier(
              testData.itemBarcodes.loan5,
              LOANS_FIELDS.LOAN.STATUS_NAME,
              'Open',
            );

            // Step 13: Navigate to Users app, verify Patron U now has 4 open loans and 3 closed loans
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
            UsersSearchPane.waitLoading();
            UsersSearchPane.resetAllFilters();
            UsersSearchPane.searchByBarcode(testData.patronU.barcode);
            UsersSearchPane.selectUserFromList(testData.patronU.barcode);
            UsersCard.expandLoansSection(4, 1);
            UsersCard.verifyQuantityOfOpenAndClaimReturnedLoans(4, 1);
          });
        },
      );
    });
  });
});
