import uuid from 'uuid';
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
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Users', () => {
    const testData = {
      patron: {},
      staffUser: {},
      servicePoint: {},
      items: [],
      callNumbers: ['aBa cde', 'Abb and test', 'abc', 'ABD'],
    };
    const instanceTitle = `AT_C1504468_Instance_${getRandomPostfix()}`;
    const itemCallNumbers = [
      {
        itemLevelCallNumberPrefix: 'aBa',
        itemLevelCallNumber: 'cde',
        itemLevelCallNumberSuffix: '',
      },
      {
        itemLevelCallNumberPrefix: 'Abb',
        itemLevelCallNumber: 'and',
        itemLevelCallNumberSuffix: 'test',
      },
      { itemLevelCallNumberPrefix: '', itemLevelCallNumber: 'abc', itemLevelCallNumberSuffix: '' },
      { itemLevelCallNumberPrefix: '', itemLevelCallNumber: '', itemLevelCallNumberSuffix: 'ABD' },
    ];

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

      cy.createTempUser([]).then((patronProperties) => {
        testData.patron = patronProperties;
      });

      cy.then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.patron.userId);
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
        itemCallNumbers.forEach((cn) => {
          InventoryItems.createItemViaApi({
            id: uuid(),
            barcode: uuid(),
            holdingsRecordId: testData.holding.id,
            materialType: { id: testData.materialTypeId },
            permanentLoanType: { id: testData.loanTypeId },
            status: { name: 'Available' },
            ...cn,
          }).then((item) => {
            testData.items.push(item);
          });
        });
      });

      cy.resetTenant();
      cy.getAdminToken();

      cy.then(() => {
        testData.items.forEach((item) => {
          Checkout.checkoutItemViaApi({
            itemBarcode: item.barcode,
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patron.barcode,
          });
        });
      });

      cy.createTempUser([]).then((staffProperties) => {
        testData.staffUser = staffProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.staffUser.userId,
          [],
          [CapabilitySets.uiUsersView, CapabilitySets.uiUsersLoansView],
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
      Users.deleteViaApi(testData.patron.userId);
      cy.setTenant(Affiliations.College);
      testData.items.forEach((item) => {
        InventoryItems.deleteItemViaApi(item.id);
      });
      InventoryHoldings.deleteHoldingRecordViaApi(testData.holding.id);
      cy.resetTenant();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C1504468 [LOC] Loan sorting by call number is case-insensitive (vega)',
      { tags: ['extendedPathECS', 'vega', 'C1504468'] },
      () => {
        // Step 1: Navigate to patron details pane, expand Loans accordion, click open loans link
        UsersSearchPane.searchByBarcode(testData.patron.barcode);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        testData.callNumbers.forEach((callNumber) => {
          LoansPage.verifyCallNumberPresent(callNumber);
        });

        // Step 2: Click Effective call number string header - records sorted ascending, case-insensitive
        LoansPage.clickEffectiveCallNumberHeader();
        LoansPage.verifyCallNumbersCaseInsensitivelySorted(false);

        // Step 3: Click Effective call number string header again - records sorted descending, case-insensitive
        LoansPage.clickEffectiveCallNumberHeader();
        LoansPage.verifyCallNumbersCaseInsensitivelySorted(true);
      },
    );
  });
});
