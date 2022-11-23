import { matching } from 'bigtest';
import {
  Pane,
  MultiColumnListRow,
  MultiColumnListCell,
  HTML,
  including,
  Button,
  KeyValue,
} from '../../../../../interactors';
import ItemView from '../../inventory/inventoryItem/itemView';
import { REQUEST_METHOD } from '../../../constants';

const claimReturnedButton = Button('Claim returned');
const declaredLostButton = Button('Declare lost');
const itemDetailsButton = Button('Item details');
const renewButton = Button('Renew');
const ellipsisButton = Button({ icon:'ellipsis' });
const rowInList = MultiColumnListRow({ indexRow: 'row-0' });

function openActionsMenuOfLoanByBarcode(itemBarcode) {
  cy.do(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).find(ellipsisButton).click());
}

function updateTimer(moduleId, routingEntry) {
  return cy.okapiRequest({
    method: REQUEST_METHOD.PATCH,
    path: `_/proxy/tenants/diku/timers/${moduleId}`,
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
    return cy.contains(itemBarcode).parent('*[class^="mclRow--"]').within(() => {
      cy.get('div input[type=checkbox]').click();
    });
  },
  selectLoan:(barcode) => {
    cy.do(rowInList.find(HTML(including(barcode))).click());
  },
  openLoan:(itemBarcode) => {
    return cy.do(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).click());
  },
  declareLoanLost:() => {
    cy.do(ellipsisButton.click());
    cy.expect(declaredLostButton.exists());
    return cy.do(declaredLostButton.click());
  },
  declareLoanLostByApi:(apiBody, loanId) => cy.okapiRequest({
    method: 'POST',
    path: `circulation/loans/${loanId}/declare-item-lost`,
    body: apiBody,
    isDefaultSearchParamsRequired: false
  }),
  openActionsMenuOfLoanByBarcode,
  declareLoanLostByBarcode:(itemBarcode) => {
    openActionsMenuOfLoanByBarcode(itemBarcode);
    return cy.do(declaredLostButton.click());
  },
  openItemRecordInInventory:(barcode) => {
    cy.expect(rowInList.find(HTML(including(barcode))).exists());
    cy.do(ellipsisButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.do(itemDetailsButton.click());
    ItemView.waitLoading();
  },
  renewItem:(barcode, isLoanOpened = false) => {
    if (isLoanOpened) {
      cy.expect(KeyValue({ value: barcode }).exists());
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    } else {
      cy.expect(rowInList.find(HTML(including(barcode))).exists());
      cy.do(ellipsisButton.click());
      cy.expect(renewButton.exists());
      cy.do(renewButton.click());
    }
  },
  checkResultsInTheRowByBarcode: (allContentToCheck, itemBarcode) => {
    return allContentToCheck.forEach(contentToCheck => cy.expect(MultiColumnListRow({ text: matching(itemBarcode), isContainer: false }).find(MultiColumnListCell({ content: including(contentToCheck) })).exists()));
  },
  verifyNumberOfLoans: (number) => {
    // verify every string in result table
    for (let i = 0; i < number; i++) {
      cy.expect(MultiColumnListRow({ rowIndexInParent: `row-${i}` }).exists());
    }
  },
  verifyQuantityOpenAndClaimedReturnedLoans: (numberOfOpenLoans, numberOfClaimedReturnedLoans) => {
    return cy.expect(Pane(including('Loans -')).find(HTML(including(`${numberOfOpenLoans} records found (${numberOfClaimedReturnedLoans} claimed returned)`))).exists());
  },
  getUserLoansIdViaApi:(userId, loanStatus = 'open') => (
    cy.okapiRequest({
      method: 'GET',
      path: `circulation/loans?query=(userId==${userId} and status.name==${loanStatus})`,
      isDefaultSearchParamsRequired: false,
    })
      .then((({ body }) => body))),

  updateTimerForAgedToLost: (mode) => {
    if (typeof mode !== 'string') {
      throw new Error('Unknown mode!');
    }

    let delayTime;
    if (mode === 'reset') {
      delayTime = '30';
    } else if (mode === 'minute') {
      delayTime = '1';
    }

    const scheduledAgeToLostModuleId = 'mod-circulation_7';
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
    const scheduledAgeToLostFeeChargingModuleId = 'mod-circulation_8';
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
  },
};
