import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import Affiliations from '../../../support/dictionary/affiliations';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import LoansPage from '../../../support/fragments/loans/loansPage';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import ConfirmItemStatusModal from '../../../support/fragments/users/loans/confirmItemStatusModal';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Users', () => {
    describe('Loans', () => {
      const testData = {
        patronA: {},
        patronB: {},
        patronC: {},
        staffUser: {},
        servicePoint: {},
        items: [],
      };
      const instanceTitle = `AT_C1504464_Instance_${getRandomPostfix()}`;
      const claimReturnedReason = 'Reason for claim returned';

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        TitleLevelRequests.enableTLRViaApi();
        TitleLevelRequests.enableConsortiaTlrViaApi();

        cy.setTenant(Affiliations.College);
        TitleLevelRequests.enableTLRViaApi();

        cy.resetTenant();
        cy.getAdminToken();

        ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
          testData.servicePoint = sp;
        });

        cy.createTempUser([]).then((props) => {
          testData.patronA = props;
        });
        cy.createTempUser([]).then((props) => {
          testData.patronB = props;
        });
        cy.createTempUser([]).then((props) => {
          testData.patronC = props;
        });

        cy.then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.patronA.userId);
          UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.patronB.userId);
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: { title: instanceTitle },
        }).then(({ instanceId }) => {
          testData.instanceId = instanceId;
        });

        cy.wait(10000);

        cy.setTenant(Affiliations.College);

        cy.getLocations({ limit: 1 }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((holdingSource) => {
          testData.holdingSourceId = holdingSource.id;
        });

        cy.then(() => {
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.instanceId,
            permanentLocationId: testData.locationId,
            sourceId: testData.holdingSourceId,
          }).then((holding) => {
            testData.holding = holding;
          });
        });

        cy.then(() => {
          Array.from({ length: 4 }).forEach(() => {
            InventoryItems.createItemViaApi({
              id: uuid(),
              barcode: uuid(),
              holdingsRecordId: testData.holding.id,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: 'Available' },
            }).then((item) => {
              testData.items.push(item);
            });
          });
        });

        cy.resetTenant();
        cy.getAdminToken();

        cy.then(() => {
          // Check out 3 items to Patron A
          [0, 1, 2].forEach((i) => {
            Checkout.checkoutItemViaApi({
              itemBarcode: testData.items[i].barcode,
              servicePointId: testData.servicePoint.id,
              userBarcode: testData.patronA.barcode,
            });
          });
          // Check out 1 item to Patron B
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.items[3].barcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patronB.barcode,
          });
        });

        cy.createTempUser([]).then((props) => {
          testData.staffUser = props;
          cy.assignCapabilitiesToExistingUser(
            testData.staffUser.userId,
            [],
            [
              CapabilitySets.uiUsersView,
              CapabilitySets.uiUsersLoansView,
              CapabilitySets.uiUsersLoansClaimItemReturnedExecute,
            ],
          );
          cy.login(testData.staffUser.username, testData.staffUser.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.staffUser.userId);
        Users.deleteViaApi(testData.patronA.userId);
        Users.deleteViaApi(testData.patronB.userId);
        Users.deleteViaApi(testData.patronC.userId);
        cy.setTenant(Affiliations.College);
        testData.items.forEach((item) => {
          InventoryItems.deleteItemViaApi(item.id);
        });
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C1504464 ECS LoC | Open loan total quantity is displayed correctly for different users (vega)',
        { tags: ['extendedPathECS', 'vega', 'C1504464'] },
        () => {
          // Step 1: Navigate to Patron A details pane, expand Loans accordion, click open loans link
          UsersSearchPane.searchByUsername(testData.patronA.username);
          UsersSearchPane.selectUserFromList(testData.patronA.username);
          Users.expandLoansAccordion();
          Users.clickOpenLoansLink();
          UserLoans.waitLoading();
          UserLoans.verifyOpenLoansTabSelected();
          UserLoans.verifyQuantityOpenLoans(3);
          UserLoans.verifyNumberOfLoans(3);
          UserLoans.checkResultsInTheRowByBarcode(
            [ITEM_STATUS_NAMES.CHECKED_OUT],
            testData.items[0].barcode,
          );

          // Step 2: Claim returned on one loan record
          UserLoans.openActionsMenuOfLoanByBarcode(testData.items[0].barcode);
          LoansPage.claimReturned();
          ConfirmItemStatusModal.confirmItemStatus(claimReturnedReason);
          UserLoans.checkResultsInTheRowByBarcode(
            [ITEM_STATUS_NAMES.CLAIMED_RETURNED],
            testData.items[0].barcode,
          );
          UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(3, 1);

          // Step 3: Close Patron A loans, navigate to Patron B, expand Loans, click open loans link
          UserLoans.closeLoansHistory();
          UsersSearchPane.searchByUsername(testData.patronB.username);
          UsersSearchPane.selectUserFromList(testData.patronB.username);
          Users.expandLoansAccordion();
          Users.clickOpenLoansLink();
          UserLoans.waitLoading();
          UserLoans.verifyOpenLoansTabSelected();
          UserLoans.verifyQuantityOpenLoans(1);
          UserLoans.verifyNumberOfLoans(1);
          UserLoans.checkResultsInTheRowByBarcode(
            [ITEM_STATUS_NAMES.CHECKED_OUT],
            testData.items[3].barcode,
          );

          // Step 4: Close Patron B loans, navigate to Patron C, expand Loans, click open loans link
          UserLoans.closeLoansHistory();
          UsersSearchPane.searchByUsername(testData.patronC.username);
          UsersSearchPane.selectUserFromList(testData.patronC.username);
          Users.expandLoansAccordion();
          Users.clickOpenLoansLink();
          UserLoans.waitLoading();
          UserLoans.verifyOpenLoansTabSelected();
          UserLoans.verifyNoItemsInLoansPage();

          // Step 5: Close Patron C loans, navigate back to Patron A, verify updated label and 3 records
          UserLoans.closeLoansHistory();
          UsersSearchPane.searchByUsername(testData.patronA.username);
          UsersSearchPane.selectUserFromList(testData.patronA.username);
          Users.expandLoansAccordion();
          Users.clickOpenLoansLink();
          UserLoans.waitLoading();
          UserLoans.verifyOpenLoansTabSelected();
          UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(3, 1);
          UserLoans.verifyNumberOfLoans(3);
        },
      );
    });
  });
});
