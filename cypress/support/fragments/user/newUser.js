import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewServicePoint from '../service_point/newServicePoint';

export default {
  patronGroupId:uuid(),
  userId:uuid(),
  checkOutId:uuid(),
  newpPassword:uuid(),
  userBarcode:`1234456_${getRandomPostfix()}`,
  userName: `autotest_name_${getRandomPostfix()}`,
  userLogin: `autotest_login_${getRandomPostfix()}`,
  password: 'password',

  createUser() {
    this.newPatronGroup();
    this.newPatron();
    this.newRequestPrefStorage();
    this.newPermissions();
    this.createNewPassword();
    this.chechOutItem();
  },
  deleteUser() {
    this.deleteNewPatron();
    this.deletePatronGroup();
  },

  newPatronGroup() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'groups',
      body: {
        desc: `autotest_name_${getRandomPostfix()}`,
        group: `autotest_group_${getRandomPostfix()}`,
        id: this.patronGroupId,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newPatron() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'users',
      body: {
        active: true,
        barcode: this.userBarcode,
        departments: [],
        id: this.userId,
        patronGroup: this.patronGroupId,
        personal: {
          email: 'drshalina20gmail.com',
          firstName: '',
          lastName: this.userName,
          preferredContactTypeId: '002',
        },
        username: this.userLogin,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newRequestPrefStorage() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'request-preference-storage/request-preference',
      body: {
        defaultDeliveryAddressTypeId: null,
        defaultServicePointId: null,
        delivery: false,
        fulfillment: 'Hold Shelf',
        holdShelf: true,
        id: uuid(),
        userId: this.userId,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newPermissions() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'perms/users?full=true&indexField=userId',
      body: {
        permissions: [],
        id: uuid(),
        userId: this.userId,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  chechOutItem() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'circulation/check-out-by-barcode',
      body: {
        id: this.checkOutId,
        itemBarcode: NewInctanceHoldingsItem.itemBarcode, // NewInctanceHoldingsItem.itemBarcode,
        loanDate: '2022-12-28T12:38:14.858Z',
        servicePointId: NewServicePoint.servicePointId,
        userBarcode: this.userBarcode,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  createNewPassword() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'authn/credentials',
      body: {
        id: uuid(),
        password: this.password,
        userId: this.userId,
        username: this.userLogin,
      }
    });
  },
  deleteNewPatron() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `users/${this.userId}`,
    });
  },
  deletePatronGroup() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${this.patronGroupId}`,
    });
  }
};

