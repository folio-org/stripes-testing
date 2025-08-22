import { APPLICATION_NAMES, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import NewRequest from '../../support/fragments/requests/newRequest';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import DateTools from '../../support/utils/dateTools';

const folioInstances = InventoryInstances.generateFolioInstances({
  itemsProperties: { missingPieces: '3', numberOfMissingPieces: '3' },
});

let checkOutUser;
const checkInUser = {};
const expirationUserDate = DateTools.getFutureWeekDateObj();
let servicePointId;
let servicePointName;

describe('Loans', () => {
  describe(
    'Loans: Change due date',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      beforeEach('create inventory instance', () => {
        let source;

        cy.createTempUser([
          Permissions.loansAll.gui,
          Permissions.checkoutAll.gui,
          Permissions.uiRequestsAll.gui,
        ]).then((userProperties) => {
          checkOutUser = userProperties;
          cy.getAdminToken()
            .then(() => {
              cy.getLocations({ limit: 1 });
              source = InventoryHoldings.getHoldingSources({ limit: 1 });
              ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
                servicePointId = res[0].id;
                servicePointName = res[0].name;
              });
              cy.getUsers({
                limit: 1,
                query: `"personal.lastName"="${checkOutUser.username}" and "active"=="true"`,
              });
            })
            .then(() => {
              UserEdit.addServicePointViaApi(servicePointId, checkOutUser.userId);
              cy.getUserServicePoints(Cypress.env('users')[0].id);
              InventoryInstances.createFolioInstancesViaApi({
                folioInstances,
                location: { id: Cypress.env('locations')[0].id },
                sourceId: source.id,
              });
            })
            .then(() => {
              cy.login(checkOutUser.username, checkOutUser.password, {
                path: TopMenu.checkOutPath,
                waiter: Checkout.waitLoading,
              });
              CheckOutActions.checkOutItemUser(
                Cypress.env('users')[0].barcode,
                folioInstances[0].barcodes[0],
              );
              MultipieceCheckOut.confirmMultipleCheckOut(folioInstances[0].barcodes[0]);
              CheckOutActions.endCheckOutSession();
              cy.getAdminToken();
              cy.updateUser({
                ...Cypress.env('users')[0],
                expirationDate: DateTools.getFormattedDate({ date: expirationUserDate }),
              });
            })
            .then(() => {
              cy.getUsers({ limit: 1, query: '"barcode"=" *" and "active"=="true"' }).then(
                (users) => {
                  checkInUser.barcode = users[0].barcode;
                },
              );
            });
        });
      });

      afterEach('Delete all data', () => {
        cy.getAdminToken();
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
        { tags: ['smoke', 'volaris', 'shiftLeft', 'C566'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
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
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
          NewRequest.createNewRequest({
            itemBarcode: folioInstances[0].barcodes[0],
            itemTitle: folioInstances[0].instanceTitle,
            requesterBarcode: checkInUser.barcode,
            pickupServicePoint: servicePointName,
            requestType: REQUEST_TYPES.RECALL,
          });

          // go to changing due date and verify warning
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          UsersCard.viewCurrentLoans();
          LoansPage.openChangeDueDateForm();
          ChangeDueDateForm.verifyRequestsCount('1');
          ChangeDueDateForm.verifyWarning('Item has been recalled');
        },
      );
    },
  );
});
