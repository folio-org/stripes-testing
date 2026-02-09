import { CheckBox, including } from '@interactors/html';

import {
  Button,
  Modal,
  Dropdown,
  HTML,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListHeader,
  MultiColumnListCell,
} from '../../../../interactors';
import ServicePoints from '../settings/tenant/servicePoints/servicePoints';
import PaymentMethods from '../settings/users/paymentMethods';
import UserEdit from './userEdit';

const waiveAllButton = Button({ id: 'open-closed-all-wave-button' });
const feeFinesList = MultiColumnList({ id: 'list-accounts-history-view-feesfines' });

export default {
  waiveFeeFine: (userId, amount, ownerId) => {
    // TODO: related with request to account getting
    cy.wait(2000);
    cy.okapiRequest({
      method: 'GET',
      path: 'accounts',
      searchParams: { query: `(userId==${userId})` },
      isDefaultSearchParamsRequired: false,
    }).then((response) => {
      const accountId = response.body.accounts[0]?.id;
      PaymentMethods.createViaApi(ownerId).then((paymentMethodProperties) => {
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then(
          (requestedServicePoints) => {
            const servicePointId = requestedServicePoints[0].id;
            UserEdit.addServicePointViaApi(servicePointId, userId);
            cy.getAdminSourceRecord().then((adminSourceRecord) => {
              cy.okapiRequest({
                method: 'POST',
                path: `accounts/${accountId}/waive`,
                body: {
                  amount,
                  // TODO: add management of payment method
                  paymentMethod: paymentMethodProperties.id,
                  notifyPatron: false,
                  servicePointId,
                  // all api methods run by diku
                  userName: adminSourceRecord,
                },
                isDefaultSearchParamsRequired: false,
              });
              // test data clearing
              PaymentMethods.deleteViaApi(paymentMethodProperties.id);
            });
          },
        );
      });
    });
  },
  goToOpenFeeFines: () => cy.do(Button({ id: 'open-accounts' }).click()),
  goToClosedFeesFines: () => cy.do(Button({ id: 'closed-accounts' }).click()),
  goToAllFeeFines: () => cy.do(Button({ id: 'all-accounts' }).click()),
  createFeeFine: () => {
    cy.do(HTML({ id: 'paneHeaderpane-account-listing' }).find(Button('Actions')).click());
    cy.wait(500);
    cy.do(Button({ id: 'open-closed-all-charge-button' }).click());
  },
  createFeeFineViaActionsButton: () => {
    cy.wait(500);
    cy.get('[data-test-pane-header-actions-button]').click();
    cy.wait(500);
    cy.do(Button({ id: 'open-closed-all-charge-button' }).click());
  },
  waitLoading: () => cy.expect(HTML('All fees/fines for ').exists()),
  verifyPageHeader: (username) => cy.expect(HTML(including(`Fees/fines - ${username}`)).exists()),
  checkRowsAreChecked: (areRowsChecked) => {
    const beChecked = areRowsChecked ? 'be.checked' : 'not.be.checked';

    cy.get('#list-accounts-history-view-feesfines')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:first-child', { withinSubject: $row }).should(beChecked);
      });
  },
  checkWaiveButtonActive: (isActive) => {
    cy.expect(waiveAllButton.has({ disabled: !isActive }));
  },
  clickOnRowByIndex: (rowIndex) => {
    cy.do(feeFinesList.find(MultiColumnListRow({ index: rowIndex })).click());
  },
  clickRowCheckbox: (rowIndex) => {
    cy.get('#list-accounts-history-view-feesfines')
      .find(`[data-row-index="row-${rowIndex}"]`)
      .find('[class*="mclCell-"]:first-child')
      .click();
  },
  clickWaiveEllipsis: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .choose('Waive'),
    );
  },
  checkWaiveEllipsisActive: (rowIndex, isActive) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .open(),
    );
    cy.expect(Button('Waive', { disabled: !isActive }).exists());
  },
  selectAllFeeFines() {
    cy.wait(500);
    cy.do(MultiColumnListHeader({ index: 0 }).find(CheckBox()).click());
    cy.wait(1000);
  },
  clickWaive: () => cy.do(waiveAllButton.click()),
  paySelectedFeeFines: () => {
    cy.do(Dropdown('Actions').choose('Pay'));
  },
  waiveSelectedFeeFines: () => {
    cy.do(Dropdown('Actions').choose('Waive'));
  },
  waiveFeeFineByRowIndex: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .choose('Waive'),
    );
  },
  refundSelectedFeeFines: () => cy.do(Dropdown('Actions').choose('Refund')),
  cancelSelectedFeeFines: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .choose('Error'),
    );
  },
  clickPayEllipsis: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .choose('Pay'),
    );
  },
  verifyPayModalIsOpen: () => {
    cy.expect(Modal('Pay fee/fine').exists());
  },
  verifyPaymentStatus: (rowIndex, status) => {
    cy.expect(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(MultiColumnListCell({ column: 'Payment status' }))
        .has({ content: status }),
    );
  },
  verifyFeeFineCount: (rowCount) => {
    cy.expect(feeFinesList.has({ rowCount }));
  },
  checkRefundEllipsisDisabled: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .open(),
    );
    cy.get('button').contains('Refund').should('have.attr', 'disabled');
    cy.get('body').type('{esc}');
  },
  checkErrorEllipsisDisabled: (rowIndex) => {
    cy.do(
      feeFinesList
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .open(),
    );
    cy.get('button').contains('Error').should('have.attr', 'disabled');
    cy.get('body').type('{esc}');
  },
  closeFeesFinesDetails: () => cy.do(Button({ icon: 'times' }).click()),
};
