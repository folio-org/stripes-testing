import uuid from 'uuid';
import Affiliations from '../../../support/dictionary/affiliations';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Loans', () => {
    describe('Loans: Renewals', () => {
      const testData = {
        patronUser: {},
        staffUser: {},
        servicePoint: {},
        items: [],
      };
      const instanceTitle = `AT_C1405042_Instance_${getRandomPostfix()}`;
      let item1Barcode;
      let item2Barcode;

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
          testData.patronUser = props;
        });

        cy.then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: { title: instanceTitle },
          }).then(({ instanceId }) => {
            testData.instanceId = instanceId;
          });
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
          Array.from({ length: 2 }).forEach(() => {
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
          item1Barcode = testData.items[0].barcode;
          item2Barcode = testData.items[1].barcode;
          Checkout.checkoutItemViaApi({
            itemBarcode: item1Barcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patronUser.barcode,
          });
          Checkout.checkoutItemViaApi({
            itemBarcode: item2Barcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patronUser.barcode,
          });
        });

        cy.createTempUser([]).then((props) => {
          testData.staffUser = props;
          cy.assignCapabilitiesToExistingUser(
            testData.staffUser.userId,
            [],
            [CapabilitySets.uiUsersLoansRenew],
          );
        });

        cy.waitForAuthRefresh(() => {
          cy.login(testData.staffUser.username, testData.staffUser.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.patronUser.userId);
        Users.deleteViaApi(testData.staffUser.userId);
        cy.setTenant(Affiliations.College);
        testData.items.forEach((item) => {
          InventoryItems.deleteItemViaApi(item.id);
        });
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C1405042 User with Loans-Renew capability set can view ECS patron loans and renew them (vega)',
        { tags: ['extendedPathECS', 'vega', 'C1405042'] },
        () => {
          // Step 1: Search for Patron User B by name, open details page
          UsersSearchPane.searchByKeywords(testData.patronUser.username);
          UsersSearchPane.openUser(testData.patronUser.username);
          UsersCard.waitLoading();

          // Step 2-3: Expand Loans accordion, click open loans link, verify loans list
          UsersCard.viewCurrentLoans({ openLoans: 2 });
          UserLoans.waitLoading();

          // Step 4-5: Open actions menu for Item 1, click Renew, verify renewal count = 1
          UserLoans.renewItem(item1Barcode);
          UserLoans.checkColumnContentInTheRowByBarcode(item1Barcode, 'Renewal count', '1');

          // Step 6: Select all loans, click Renew, verify both renewed in confirmation modal
          UserLoans.renewAllItems();
          RenewConfirmationModal.waitLoading();
          RenewConfirmationModal.verifyRenewConfirmationModal([
            { itemBarcode: item1Barcode, status: 'Item successfully renewed' },
            { itemBarcode: item2Barcode, status: 'Item successfully renewed' },
          ]);
          RenewConfirmationModal.closeModal();
          UserLoans.checkColumnContentInTheRowByBarcode(item1Barcode, 'Renewal count', '2');
          UserLoans.checkColumnContentInTheRowByBarcode(item2Barcode, 'Renewal count', '1');

          // Step 7: Open loan details for Item 2
          UserLoans.openLoanDetails(item2Barcode);
          LoanDetails.waitLoanDetailsLoading();

          // Step 8: Renew from loan details page, verify action and renewal count = 2
          UserLoans.renewItem(item2Barcode, true);
          LoanDetails.checkAction(0, 'Renewed');
          LoanDetails.checkKeyValue('Renewal count', '2');
        },
      );
    });
  });
});
