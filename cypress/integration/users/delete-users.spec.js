import uuid from 'uuid';

import {
  Button,
  KeyValue,
  Modal,
  Pane,
} from '../../../interactors';
import servicePoints from '../../support/fragments/settings/tenant/servicePoints';

import generateItemBarcode from '../../support/utils/generateItemBarcode';
import EditRequest from '../../support/fragments/requests/edit-request';

describe('Deleting user', () => {
  const lastName = 'Test-' + uuid();
  const ResultsPane = Pane({ index: 2 });
  const ModalButtonYes = Button({ id: 'delete-user-button' });
  const ModalButtonNo = Button({ id: 'close-delete-user-button' });

  function verifyUserDeleteImpossible(id) {
    cy.visit(`/users/preview/${id}`);
    cy.do(
      ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' })
    );

    cy.expect(
      Modal().find(ModalButtonYes).absent()
    );
  }

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'),
      Cypress.env('diku_password'));
    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
    cy.getCancellationReasonsApi({ limit: 1 });
    cy.getUserGroups({ limit: 1 });
  });

  beforeEach(() => {
    const userData = {
      active: true,
      barcode: uuid(),
      personal: {
        preferredContactTypeId: '002',
        lastName,
        email: 'test@folio.org',
      },
      patronGroup: Cypress.env('userGroups')[0].id,
      departments: []
    };
    cy.createUserApi(userData);
  });

  afterEach(() => {
    cy.getUsers({ query: `personal.lastName="${lastName}"` })
      .then(() => {
        Cypress.env('users').forEach(user => {
          cy.deleteUser(user.id);
        });
      });
  });

  it('should be possible by user delete action', function () {
    const { id } = Cypress.env('user');

    cy.visit(`/users/preview/${id}`);
    cy.do([
      ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' }),
      ModalButtonYes.click(),
    ]);

    cy.visit(`/users/preview/${id}`);
    cy.expect(ResultsPane.has({ id: 'pane-user-not-found' }));
  });

  it('should be cancelled when user presses "No" in confirmation modal', function () {
    const { id } = Cypress.env('user');

    cy.visit(`/users/preview/${id}`);
    cy.do([
      ResultsPane.clickAction({ id: 'clickable-checkdeleteuser' }),
      ModalButtonNo.click(),
    ]);

    cy.visit(`/users/preview/${id}`);
    cy.expect(KeyValue({ value: lastName }).exists());
  });

  it('should be unable in case the user has open requests', function () {
    const { id: userId } = Cypress.env('user');
    cy
      .getItems({ limit: 1, query: 'status.name=="Available"' })
      .then(() => {
        cy.createItemRequestApi({
          requestType: 'Page',
          fulfilmentPreference: 'Hold Shelf',
          itemId: Cypress.env('items')[0].id,
          requesterId: userId,
          pickupServicePointId: Cypress.env('servicePoints')[0].id,
          requestDate: '2021-09-20T18:36:56Z',
        });
      })
      .then((request) => {
        verifyUserDeleteImpossible(userId);

        EditRequest.updateRequestApi({
          ...request,
          status: 'Closed - Cancelled',
          cancelledByUserId: userId,
          cancellationReasonId: Cypress.env('cancellationReasons')[0].id,
          cancelledDate: '2021-09-30T16:14:50.444Z',
        });
      });
  });

  it('should be unable in case the user has open loans', function () {
    const ITEM_BARCODE = generateItemBarcode();
    const user = Cypress.env('user');
    const servicePoint = Cypress.env('servicePoints')[0];

    cy
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: `Pre-checkout instance ${Number(new Date())}`,
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: Cypress.env('holdingSources')[0].id,
          }],
          items: [
            [{
              barcode: ITEM_BARCODE,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
              materialType: { id: Cypress.env('materialTypes')[0].id },
            }],
          ],
        });
      })
      .then(() => {
        cy.createItemCheckout({
          itemBarcode: ITEM_BARCODE,
          userBarcode: user.barcode,
          servicePointId: servicePoint.id,
        });
      })
      .then(() => {
        verifyUserDeleteImpossible(user.id);

        cy.createItemCheckinApi({
          itemBarcode: ITEM_BARCODE,
          servicePointId: servicePoint.id,
          checkInDate: '2021-09-30T16:14:50.444Z',
        });
      });
  });

  it('should be unable in case the user has open unexpired proxy', function () {
    const { id: userId } = Cypress.env('user');
    const userProxyData = {
      active: true,
      barcode: uuid(),
      personal: {
        preferredContactTypeId: '002',
        lastName: 'Proxy-' + uuid(),
        email: 'Proxy@folio.org',
      },
      patronGroup: Cypress.env('userGroups')[0].id,
      departments: []
    };
    cy.createUserApi(userProxyData)
      .then(() => {
        const proxy = {
          accrueTo: 'Sponsor',
          notificationsTo: 'Sponsor',
          requestForSponsor: 'Yes',
          status: 'Active',
          proxyUserId: Cypress.env('user').id,
          userId,
        };
        cy.createProxyApi(proxy);
      })
      .then(() => {
        verifyUserDeleteImpossible(userId);
        cy.deleteProxyApi(Cypress.env('proxy').id);
      });
  });

  it('should be unable in case the user has open blocks', function () {
    const { id: userId } = Cypress.env('user');
    cy.createBlockApi({
      userId,
      desc: 'desc',
      borrowing: true,
    })
      .then(() => {
        verifyUserDeleteImpossible(userId);
        cy.deleteBlockApi(Cypress.env('block').id);
      });
  });

  it('should be unable in case the user has open fees/fines', function () {
    const { id: userId } = Cypress.env('user');
    cy.createOwnerApi({ owner: uuid() })
      .then(() => cy.createFeesFinesTypeApi({
        feeFineType: uuid(),
        ownerId: Cypress.env('owner').id,
      }))
      .then(() => cy.createFeesFinesApi({
        id: uuid(),
        userId,
        ownerId: Cypress.env('owner').id,
        feeFineId: Cypress.env('feesFinesType').id,
        amount: '11.00',
        remaining: '11.00',
        status: { name: 'Open' },
      }))
      .then(() => {
        verifyUserDeleteImpossible(userId);
        cy.deleteFeesFinesApi(Cypress.env('feesFines').id);
        cy.deleteFeesFinesTypeApi(Cypress.env('feesFinesType').id);
        cy.deleteOwnerApi(Cypress.env('owner').id);
      });
  });
});
