import moment from 'moment';
import { matching } from 'bigtest';
import {
  Pane,
  MultiColumnListRow,
  MultiColumnListCell,
  Select,
  HTML,
  including,
  Button,
  KeyValue,
  PaneHeader,
} from '../../../../../interactors';
import ItemRecordView from '../../inventory/item/itemRecordView';
import { REQUEST_METHOD } from '../../../constants';
import LoansPage from '../../loans/loansPage';
import ConfirmItemStatusModal from './confirmItemStatusModal';

const loansHistoryPane = PaneHeader({ id: 'paneHeaderpane-loanshistory' });
const claimReturnedButton = Button('Claim returned');
const declaredLostButton = Button('Declare lost');
const itemDetailsButton = Button('Item details');
const markAsMissingButton = Button('Mark as missing');
const newFeeFineButton = Button('New fee/fine');
const renewButton = Button('Renew');
const chageDueDateButton = Button('Change due date');
const ellipsisButton = Button({ icon: 'ellipsis' });
const rowInList = MultiColumnListRow({ indexRow: 'row-0' });

function openActionsMenuOfLoanByBarcode(itemBarcode) {
  cy.do(
    MultiColumnListRow({ text: matching(itemBarcode), isContainer: false })
      .find(ellipsisButton)
      .click(),
  );
}

function updateTimer(moduleId, routingEntry) {
  return cy.okapiRequest({
    method: REQUEST_METHOD.PATCH,
    path: `_/proxy/tenants/${Cypress.env('OKAPI_TENANT')}/timers/${moduleId}`,
    body: routingEntry,
    isDefaultSearchParamsRequired: false,
  });
}

export default {
  openClaimReturnedPane() {
    return cy.do(claimReturnedButton.click());
  },
  verifyClaimReturnedButtonIsDisabled() {
    return cy.expect(claimReturnedButton.absent());
  },
  verifyClaimReturnedButtonIsVisible() {
    return cy.expect(claimReturnedButton.exists());
  },
  checkOffLoanByBarcode: (itemBarcode) => {
    // interactors don't allow to find element inside the cell column
    return cy
      .contains(itemBarcode)
      .parent('*[class^="mclRow--"]')
      .within(() => {
        cy.get('div input[type=checkbox]').click();
      });
  },
  selectLoan: (barcode) => {
    cy.do(rowInList.find(HTML(including(barcode))).click());
  },
  openLoanDetails: (itemBarcode) => {
    cy.do(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).click());
    return LoansPage;
  },
  openChangeDueDatePane: () => {
    cy.do(chageDueDateButton.click());
  },
  closeLoansHistory() {
    cy.do(loansHistoryPane.find(Button({ ariaLabel: 'Close ' })).click());
  },
  expandActionsMenu(barcode) {
    cy.get('div[class^="mclRow--"]')
      .contains('div[class^="mclCell-"]', barcode)
      .then((elem) => {
        elem.parent()[0].querySelector('button[icon="ellipsis"]').click();
      });
  },
  declareLoanLost(barcode) {
    this.expandActionsMenu(barcode);
    cy.expect(declaredLostButton.exists());
    cy.do(declaredLostButton.click());

    return ConfirmItemStatusModal;
  },
  markAsMissing(barcode) {
    this.expandActionsMenu(barcode);
    cy.expect(markAsMissingButton.exists());
    cy.do(markAsMissingButton.click());

    return ConfirmItemStatusModal;
  },
  createNewFeeFine(barcode, ownerId, feeFineType) {
    this.expandActionsMenu(barcode);
    cy.do([
      newFeeFineButton.click(),
      Select({ id: 'ownerId' }).choose(ownerId),
      Select({ id: 'feeFineType' }).choose(feeFineType),
    ]);
    cy.expect(Button('Charge only').has({ disabled: false }));
    cy.wait(2000);
    cy.do(Button('Charge only').click());
    cy.wait(1000);
  },
  declareLoanLostViaApi: (
    {
      comment = 'Reason why the item is declared lost',
      declaredLostDateTime = moment.utc().format(),
      id,
      servicePointId,
    } = {},
    loanId,
  ) => cy.okapiRequest({
    method: 'POST',
    path: `circulation/loans/${loanId}/declare-item-lost`,
    body: {
      comment,
      declaredLostDateTime,
      id,
      servicePointId,
    },
    isDefaultSearchParamsRequired: false,
  }),
  claimItemReturnedViaApi: (
    {
      comment = 'Reason why the item is claime returned',
      itemClaimedReturnedDateTime = moment.utc().format(),
      id,
    },
    loanId,
  ) => cy.okapiRequest({
    method: 'POST',
    path: `circulation/loans/${loanId}/claim-item-returned`,
    body: {
      comment,
      itemClaimedReturnedDateTime,
      id,
    },
    isDefaultSearchParamsRequired: false,
  }),
  renewItemViaApi: (apiBody) => cy.okapiRequest({
    method: 'POST',
    path: 'circulation/renew-by-barcode',
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
  changeDueDateViaApi: (apiBody, loanId) => cy.okapiRequest({
    method: 'PUT',
    path: `circulation/loans/${loanId}`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
  changeDueDateForAllOpenPatronLoans(userId, day) {
    this.getUserLoansIdViaApi(userId).then((userLoans) => {
      const loansData = userLoans.loans;
      const newDueDate = new Date(loansData[0].loanDate);
      newDueDate.setDate(newDueDate.getDate() + day);
      loansData.forEach((loan) => {
        this.changeDueDateViaApi(
          {
            ...loan,
            dueDate: newDueDate,
            action: 'dueDateChanged',
          },
          loan.id,
        );
      });
    });
  },
  openActionsMenuOfLoanByBarcode,
  openItemRecordInInventory: (barcode) => {
    cy.get('div[class^="mclRow--"]')
      .contains('div[class^="mclCell-"]', barcode)
      .then((elem) => {
        elem.parent()[0].querySelector('button[icon="ellipsis"]').click();
      });
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
    ItemRecordView.waitLoading();
  },
  renewItem: (barcode, isLoanOpened = false) => {
    if (isLoanOpened) {
      cy.expect(KeyValue({ value: barcode }).exists());
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    } else {
      cy.wait(1500);
      cy.get('div[class^="mclRow--"]')
        .contains('div[class^="mclCell-"]', barcode)
        .then((elem) => {
          elem.parent()[0].querySelector('button[icon="ellipsis"]').click();
        });
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    }
  },
  checkResultsInTheRowByBarcode: (allContentToCheck, itemBarcode) => {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(
      MultiColumnListRow({ text: matching(itemBarcode), isContainer: false })
        .find(MultiColumnListCell({ content: including(contentToCheck) }))
        .exists(),
    ));
  },
  verifyNumberOfLoans: (number) => {
    // verify every string in result table
    for (let i = 0; i < number; i++) {
      cy.expect(MultiColumnListRow({ rowIndexInParent: `row-${i}` }).exists());
    }
  },
  verifyQuantityOpenAndClaimedReturnedLoans: (numberOfOpenLoans, numberOfClaimedReturnedLoans) => {
    return cy.expect(
      Pane(including('Loans -'))
        .find(
          HTML(
            including(
              `${numberOfOpenLoans} records found (${numberOfClaimedReturnedLoans} claimed returned)`,
            ),
          ),
        )
        .exists(),
    );
  },
  getUserLoansIdViaApi: (userId, loanStatus = 'open') => cy
    .okapiRequest({
      method: 'GET',
      path: `circulation/loans?query=(userId==${userId} and status.name==${loanStatus})`,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => body),

  getListTimersForTenant: () => cy
    .okapiRequest({
      method: 'GET',
      path: '_/proxy/tenants/diku/timers',
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => body),

  updateTimerForAgedToLost(mode) {
    if (typeof mode !== 'string') {
      throw new Error('Unknown mode!');
    }

    let delayTime;
    if (mode === 'reset') {
      delayTime = '30';
    } else if (mode === 'minute') {
      delayTime = '1';
    }

    this.getListTimersForTenant().then((timers) => {
      const scheduledAgeToLostModuleId = timers.find(
        (t) => t.routingEntry.pathPattern === '/circulation/scheduled-age-to-lost',
      ).id;
      const scheduledAgeToLostRoutingEntry = {
        methods: ['POST'],
        pathPattern: '/circulation/scheduled-age-to-lost',
        unit: 'minute',
        delay: delayTime,
        modulePermissions: [
          'circulation-storage.loans.item.put',
          'circulation-storage.loans.item.get',
          'circulation-storage.loans.collection.get',
          'circulation-storage.circulation-rules.get',
          'circulation-storage.patron-notice-policies.collection.get',
          'circulation-storage.patron-notice-policies.item.get',
          'inventory-storage.items.item.put',
          'circulation.internal.fetch-items',
          'lost-item-fees-policies.item.get',
          'lost-item-fees-policies.collection.get',
          'pubsub.publish.post',
          'users.item.get',
          'users.collection.get',
          'scheduled-notice-storage.scheduled-notices.item.post',
        ],
      };
      const scheduledAgeToLostFeeChargingModuleId = timers.find(
        (t) => t.routingEntry.pathPattern === '/circulation/scheduled-age-to-lost-fee-charging',
      ).id;
      const scheduledAgeToLostFeeChargingRoutingEntry = {
        methods: ['POST'],
        pathPattern: '/circulation/scheduled-age-to-lost-fee-charging',
        unit: 'minute',
        delay: delayTime,
        modulePermissions: [
          'circulation-storage.loans.item.put',
          'circulation-storage.loans.item.get',
          'circulation-storage.loans.collection.get',
          'inventory-storage.items.item.put',
          'circulation.internal.fetch-items',
          'lost-item-fees-policies.item.get',
          'lost-item-fees-policies.collection.get',
          'owners.collection.get',
          'feefines.collection.get',
          'accounts.item.post',
          'feefineactions.item.post',
          'pubsub.publish.post',
          'users.item.get',
          'users.collection.get',
          'usergroups.collection.get',
          'usergroups.item.get',
          'circulation-storage.circulation-rules.get',
          'circulation-storage.patron-notice-policies.item.get',
          'circulation-storage.patron-notice-policies.collection.get',
          'circulation.rules.notice-policy.get',
          'scheduled-notice-storage.scheduled-notices.item.post',
          'actual-cost-record-storage.actual-cost-records.item.post',
        ],
      };
      updateTimer(scheduledAgeToLostModuleId, scheduledAgeToLostRoutingEntry);
      updateTimer(scheduledAgeToLostFeeChargingModuleId, scheduledAgeToLostFeeChargingRoutingEntry);
    });
  },
};
