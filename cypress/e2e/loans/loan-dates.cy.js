import TopMenu from '../../support/fragments/topMenu';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import { REQUEST_TYPES } from '../../support/constants';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import LoansPage from '../../support/fragments/loans/loansPage';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DateTools from '../../support/utils/dateTools';
import NewRequest from '../../support/fragments/requests/newRequest';
import Users from '../../support/fragments/users/users';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import UserEdit from '../../support/fragments/users/userEdit';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

const folioInstances = InventoryInstances.generateFolioInstances({
  properties: { missingPieces: '3', numberOfMissingPieces: '3' },
});

let checkOutUser;
const checkInUser = {};
const expirationUserDate = DateTools.getFutureWeekDateObj();
let servicePointId;

describe('loan dates', () => {
  before('create inventory instance', () => {
    let source;

    cy.createTempUser([
      Permissions.loansAll.gui,
      Permissions.checkoutAll.gui,
      Permissions.requestsAll.gui,
    ]).then((userProperties) => {
      checkOutUser = userProperties;
      cy.getAdminToken()
        .then(() => {
          cy.getLocations({ limit: 1 });
          source = InventoryHoldings.getHoldingSources({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            servicePointId = res[0].id;
          });
          cy.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, userProperties.userId);
          cy.getUserServicePoints(Cypress.env('users')[0].id);
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location: { id: Cypress.env('locations')[0].id },
            sourceId: source.id,
          });
        })
        .then(() => {
          cy.login(userProperties.username, userProperties.password);
          cy.visit(TopMenu.checkOutPath);
          CheckOutActions.checkOutItemUser(
            Cypress.env('users')[0].barcode,
            folioInstances[0].barcodes[0],
          );
          MultipieceCheckOut.confirmMultipleCheckOut(folioInstances[0].barcodes[0]);
          CheckOutActions.endCheckOutSession();
          cy.updateUser({
            ...Cypress.env('users')[0],
            expirationDate: DateTools.getFormattedDate({ date: expirationUserDate }),
          });
        })
        .then(() => {
          cy.getUsers({ limit: 1, query: '"barcode"="" and "active"="true"' }).then((users) => {
            checkInUser.barcode = users[0].barcode;
          });
        });
    });
  });

  after('Delete all data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: folioInstances[0].barcodes[0],
      servicePointId,
    });
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `"items.barcode"=="${folioInstances[0].barcodes[0]}"`,
    }).then((instance) => {
      cy.deleteItemViaApi(instance.items[0].id);
      cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
      InventoryInstance.deleteInstanceViaApi(instance.id);
    });
    Users.deleteViaApi(checkOutUser.userId);
  });

  it(
    'C566 Loan: Change due date warnings and alerts (volaris)',
    { tags: [TestTypes.smoke, DevTeams.volaris] },
    () => {
      cy.visit(TopMenu.usersPath);
      // show open loans
      UsersSearchPane.searchByKeywords(checkOutUser.username);
      UsersSearchPane.openUser(checkOutUser.userId);
      UsersCard.viewCurrentLoans();

      // change date to past and verify warning
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.fillDate('04/19/2022');
      ChangeDueDateForm.verifyWarning('New due date is in the past.');
      ChangeDueDateForm.saveAndClose();

      // change date to date after patron's expiration and verify warning
      const loanDateAfterExpirationUser = new Date(
        expirationUserDate.getFullYear(),
        expirationUserDate.getMonth(),
        expirationUserDate.getDate() + 7,
      );
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.fillDate(
        DateTools.getFormattedDate({ date: loanDateAfterExpirationUser }, 'MM/DD/YYYY'),
      );
      ChangeDueDateForm.verifyWarning("New due date is after patron's expiration.");
      ChangeDueDateForm.saveAndClose();
      LoansPage.closeLoanDetails();

      // create request
      cy.visit(TopMenu.requestsPath);
      NewRequest.createNewRequest({
        itemBarcode: folioInstances[0].barcodes[0],
        itemTitle: folioInstances[0].instanceTitle,
        requesterBarcode: checkInUser.barcode,
        pickupServicePoint: 'Circ Desk 1',
        requestType: REQUEST_TYPES.RECALL,
      });

      // go to changing due date and verify warning
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords(checkOutUser.username);
      UsersSearchPane.openUser(checkOutUser.userId);
      UsersCard.viewCurrentLoans();
      LoansPage.openChangeDueDateForm();
      ChangeDueDateForm.verifyRequestsCount('1');
      ChangeDueDateForm.verifyWarning('Item has been recalled');
    },
  );
});
