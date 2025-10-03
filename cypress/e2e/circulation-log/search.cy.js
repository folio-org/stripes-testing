import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let sourceId;
let servicePointId;
let servicePointName;
let firstName;

describe('Circulation log', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      firstName = userProperties.firstName;
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 1 });
          cy.getHoldingTypes({ limit: 1 });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          cy.getInstanceTypes({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            servicePointId = res[0].id;
            servicePointName = res[0].name;
          });
          cy.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, userId);
          cy.getUserServicePoints(Cypress.env('users')[0].id);
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: `Barcode search test ${Number(new Date())}`,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId,
              },
            ],
            items: [
              [
                {
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
              ],
            ],
          });
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: ITEM_BARCODE,
            userBarcode: Cypress.env('users')[0].barcode,
            servicePointId,
          });
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.circulationLogPath,
            waiter: SearchPane.waitLoading,
          });
        });
    });
  });

  beforeEach(() => {
    cy.wait(3000);
  });

  after('delete test data', () => {
    cy.getAdminToken();
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: new Date().toISOString(),
    }).then(() => {
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${ITEM_BARCODE}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      cy.getBlockApi(userId).then(() => {
        if (Cypress.env('blockIds')[0]) {
          cy.deleteBlockApi(Cypress.env('blockIds')[0].id);
        }
      });
      Users.deleteViaApi(userId);
    });
  });

  it(
    'C17010 Filter circulation log by service points (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17010'] },
    () => {
      SearchPane.searchByServicePoint(servicePointName);
      SearchPane.verifyResultCells();
      SearchPane.resetResults();
    },
  );

  it(
    'C16979 Check item details from filtering Circulation log by checked-out (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16979'] },
    () => {
      SearchPane.searchByItemBarcode(ITEM_BARCODE);
      SearchResults.clickOnCell(ITEM_BARCODE, 0);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
    },
  );

  it(
    'C16976 Filter circulation log by date (volaris)',
    { tags: ['smoke', 'volaris', 'C16976'] },
    () => {
      const verifyDate = true;

      SearchPane.filterByLastWeek();
      SearchPane.verifyResultCells(verifyDate);
      SearchPane.resetResults();
    },
  );

  it(
    'C16978 Filter circulation log by checked-out (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16978'] },
    () => {
      SearchPane.searchByCheckedOut();
      SearchPane.verifyResult(ITEM_BARCODE);
      SearchPane.resetFilters();
      SearchPane.searchByItemBarcode(ITEM_BARCODE);
      SearchPane.checkResultSearch({
        itemBarcode: ITEM_BARCODE,
        circAction: 'Checked out',
      });
      SearchPane.resetResults();
    },
  );

  it(
    'C15853 Filter circulation log on description (volaris)',
    { tags: ['smoke', 'volaris', 'C15853'] },
    () => {
      // login with user that has all permissions
      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });

      // find user
      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByKeywords(userId);
      UsersSearchPane.openUser(userId);

      // create patron block
      const searchString = `${getRandomPostfix()}`;
      const testDescription = `test ${searchString} description filter`;

      UsersCard.openPatronBlocks();
      UsersCard.createPatronBlock();
      UsersCard.fillDescription(testDescription);
      UsersCard.saveAndClose();

      // verify circulation logs result
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      SearchPane.searchByDescription(searchString);
      SearchPane.verifyResultCells();
    },
  );

  it(
    'C16975 Check the Actions button from filtering Circulation log by description (User details) (firebird)',
    { tags: ['criticalPath', 'firebird', 'C16975'] },
    () => {
      SearchPane.goToUserDetails();
      SearchPane.userDetailIsOpen();
    },
  );

  it(
    'C16980 Filter circulation log by changed due date (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16980'] },
    () => {
      cy.loginAsAdmin({ path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });

      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByKeywords(userId);
      UsersSearchPane.openUser(userId);
      UsersCard.viewCurrentLoans();
      LoansPage.checkAll();
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.fillDate('04/19/2030');
      ChangeDueDateForm.saveAndClose();

      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.CIRCULATION_LOG);
      SearchPane.searchByChangedDueDate();
      SearchPane.verifyResultCells();
    },
  );

  it(
    'C16981 Check the Actions button from filtering Circulation log by changed due date (volaris)',
    { tags: ['criticalPath', 'volaris', 'C16981'] },
    () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
      SearchPane.searchByChangedDueDate();
      SearchPane.checkActionButtonAfterFiltering(firstName, ITEM_BARCODE);
    },
  );
});
