import { CheckBox } from '@interactors/html';
import {
  Button,
  Dropdown,
  HTML,
  MultiColumnList,
  MultiColumnListRow,
  MultiColumnListHeader,
} from '../../../../interactors';
import ServicePoints from '../settings/tenant/servicePoints/servicePoints';
import PaymentMethods from '../settings/users/paymentMethods';
import UserEdit from './userEdit';

const waiveAllButton = Button({ id: 'open-closed-all-wave-button' });

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
            UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
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
                  userName: 'ADMINISTRATOR, DIKU',
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
  goToAllFeeFines: () => cy.do(Button({ id: 'all-accounts' }).click()),
  createFeeFine: () => {
    cy.do(Button('Actions').click());
    cy.do(Button({ id: 'open-closed-all-charge-button' }).click());
  },
  waitLoading: () => cy.expect(HTML('All fees/fines for ').exists()),
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
  clickRowCheckbox: (rowIndex) => {
    cy.get('#list-accounts-history-view-feesfines')
      .find(`[data-row-index="row-${rowIndex}"]`)
      .find('[class*="mclCell-"]:first-child')
      .click();
  },
  clickWaiveEllipsis: (rowIndex) => {
    cy.do(
      MultiColumnList({ id: 'list-accounts-history-view-feesfines' })
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .choose('Waive'),
    );
  },
  checkWaiveEllipsisActive: (rowIndex, isActive) => {
    cy.do(
      MultiColumnList({ id: 'list-accounts-history-view-feesfines' })
        .find(MultiColumnListRow({ index: rowIndex }))
        .find(Dropdown())
        .open(),
    );
    cy.expect(Button('Waive', { disabled: !isActive }).exists());
  },
  selectAllFeeFines: () => cy.do(MultiColumnListHeader({ index: 0 }).find(CheckBox()).click()),
  clickWaive: () => cy.do(waiveAllButton.click()),
  paySelectedFeeFines: () => {
    cy.do(Dropdown('Actions').choose('Pay'));
  },
};
