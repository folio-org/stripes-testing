import TopMenu from '../../support/fragments/topMenu';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DateTools from '../../support/utils/dateTools';
import Users from '../../support/fragments/users/users';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import UserEdit from '../../support/fragments/users/userEdit';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Loans from '../../support/fragments/users/userDefaultObjects/loans';

const folioInstances = InventoryInstances.generateFolioInstances({
  properties: { missingPieces: '3', numberOfMissingPieces: '3' },
});

let checkOutUser;
const FIRST_ACTION_ROW_INDEX = 0;
const checkInUser = {};
const expirationUserDate = DateTools.getFutureWeekDateObj();
let servicePointId;

describe('change loan due dates', () => {
  before('create inventory instance', () => {
    let source;

    cy.createTempUser([Permissions.loansAll.gui, Permissions.checkoutAll.gui]).then(
      (userProperties) => {
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
      },
    );
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
    'C581 Loan Details: Test change due date (Vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      const itemBarcode = folioInstances[0].barcodes[0];
      cy.visit(TopMenu.usersPath);
      // show open loans
      UsersSearchPane.searchByKeywords(checkOutUser.username);
      UsersSearchPane.openUser(checkOutUser.userId);
      UsersCard.viewCurrentLoans();

      const loanDueDateAfterChanged = DateTools.getCurrentEndOfDay().add(1, 'day');
      UserLoans.openLoanDetails(itemBarcode);
      UserLoans.openChangeDueDatePane();
      ChangeDueDateForm.fillDate(loanDueDateAfterChanged.format('MM/DD/YYYY'));
      ChangeDueDateForm.saveAndClose();
      LoanDetails.checkActionDueDate(FIRST_ACTION_ROW_INDEX, loanDueDateAfterChanged);
      LoanDetails.checkStatusInList(FIRST_ACTION_ROW_INDEX, 'Checked out');
      UsersCard.getApi(checkOutUser.userId).then((user) => {
        Loans.getApi(checkOutUser.userId).then(([foundByLibraryLoan]) => {
          cy.getLoanHistory(foundByLibraryLoan.id).then(([loanHistoryFirstAction]) => {
            LoanDetails.checkAction(FIRST_ACTION_ROW_INDEX, 'Due date changed');
            LoanDetails.checkSource(FIRST_ACTION_ROW_INDEX, user);
            LoanDetails.checkActionDate(
              FIRST_ACTION_ROW_INDEX,
              loanHistoryFirstAction.loan.metadata.updatedDate,
            );
          });
        });
      });
      const loanDueDateAfterChangedAgain = DateTools.getCurrentEndOfDay().add(6, 'day');
      UserLoans.openChangeDueDatePane();
      ChangeDueDateForm.fillDate(loanDueDateAfterChangedAgain.format('MM/DD/YYYY'));
      ChangeDueDateForm.saveAndClose();
      LoanDetails.checkActionDueDate(FIRST_ACTION_ROW_INDEX, loanDueDateAfterChangedAgain);
      LoanDetails.checkStatusInList(FIRST_ACTION_ROW_INDEX, 'Checked out');
      UsersCard.getApi(checkOutUser.userId).then((user) => {
        Loans.getApi(checkOutUser.userId).then(([foundByLibraryLoan]) => {
          cy.getLoanHistory(foundByLibraryLoan.id).then(([loanHistoryFirstAction]) => {
            LoanDetails.checkAction(FIRST_ACTION_ROW_INDEX, 'Due date changed');
            LoanDetails.checkSource(FIRST_ACTION_ROW_INDEX, user);
            LoanDetails.checkActionDate(
              FIRST_ACTION_ROW_INDEX,
              loanHistoryFirstAction.loan.metadata.updatedDate,
            );
          });
        });
      });
    },
  );
});
