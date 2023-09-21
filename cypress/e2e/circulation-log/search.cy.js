import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Checkout from '../../support/fragments/checkout/checkout';
import LoansPage from '../../support/fragments/loans/loansPage';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { ITEM_STATUS_NAMES } from '../../support/constants';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let source;
let servicePointId;
let firstName;

describe('circulation-log', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      firstName = userProperties.firstName;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.circulationLogPath);
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1 });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 1 });
          cy.getHoldingTypes({ limit: 1 });
          source = InventoryHoldings.getHoldingSources({ limit: 1 });
          cy.getInstanceTypes({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            servicePointId = res[0].id;
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
                sourceId: source.id,
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
        });
    });
  });

  after('delete test data', () => {
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
    'C15484 Filter circulation log on item barcode (firebird)',
    { tags: [TestTypes.smoke, devTeams.firebird] },
    () => {
      SearchPane.searchByItemBarcode(ITEM_BARCODE);
      SearchPane.verifyResultCells();
      SearchPane.resetResults();
    },
  );

  it(
    'C16979 Check item details from filtering Circulation log by checked-out (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
    () => {
      SearchPane.searchByItemBarcode(ITEM_BARCODE);
      SearchResults.clickOnCell(ITEM_BARCODE, 0);
      ItemRecordView.waitLoading();
      ItemRecordView.closeDetailView();
      cy.visit(TopMenu.circulationLogPath);
    },
  );

  it(
    'C16976 Filter circulation log by date (firebird)',
    { tags: [TestTypes.smoke, devTeams.firebird] },
    () => {
      const verifyDate = true;

      SearchPane.filterByLastWeek();
      SearchPane.verifyResultCells(verifyDate);
      SearchPane.resetResults();
    },
  );

  it(
    'C15485 Filter circulation log on user barcode (firebird)',
    { tags: [TestTypes.smoke, devTeams.firebird] },
    () => {
      const userBarcode = Cypress.env('users')[0].barcode;

      SearchPane.searchByUserBarcode(userBarcode);
      SearchPane.verifyResultCells();
      SearchPane.resetResults();
    },
  );

  it(
    'C16978 Filter circulation log by checked-out (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
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
    'C15853 Filter circulation log on description (firebird)',
    { tags: [TestTypes.smoke, devTeams.firebird] },
    () => {
      // login with user that has all permissions
      cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.visit(TopMenu.usersPath);

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
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.searchByDescription(searchString);
      SearchPane.verifyResultCells();
    },
  );

  it(
    'C16975 Check the Actions button from filtering Circulation log by description (User details) (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
    () => {
      SearchPane.goToUserDetails();
      SearchPane.userDetailIsOpen();
    },
  );

  it(
    'C16980 Filter circulation log by changed due date (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
    () => {
      cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
      cy.visit(TopMenu.usersPath);

      UsersSearchPane.searchByStatus('Active');
      UsersSearchPane.searchByKeywords(userId);
      UsersSearchPane.openUser(userId);
      UsersCard.viewCurrentLoans();
      LoansPage.checkAll();
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.fillDate('04/19/2030');
      ChangeDueDateForm.saveAndClose();

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.searchByChangedDueDate();
      SearchPane.verifyResultCells();
    },
  );

  it(
    'C17010 Filter circulation log by service points (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
    () => {
      SearchPane.searchByServicePoint('Circ Desk 2');
      SearchPane.verifyResultCells();
    },
  );

  it(
    'C16981 Check the Actions button from filtering Circulation log by changed due date (firebird)',
    { tags: [TestTypes.criticalPath, devTeams.firebird] },
    () => {
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.searchByChangedDueDate();
      SearchPane.checkActionButtonAfterFiltering(firstName, ITEM_BARCODE);
    },
  );
});
