import uuid from 'uuid';
import moment from 'moment';

import { Permissions } from '../../support/dictionary';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';

describe('Fees&Fines', () => {
  describe('Cancel Fee/Fine as Error - Disabled for Partial Actions', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      transferAccount: TransferAccounts.getDefaultNewTransferAccount(
        uuid(),
        'TestTransferAccount',
        'Test transfer account',
      ),
      waiveReason: WaiveReasons.getDefaultNewWaiveReason(
        uuid(),
        'Waive reason for C17157',
        'Description for C17157',
      ),
      owner: {},
      manualCharge: {},
      paymentMethod: {},
      user1: {},
      user2: {},
      user3: {},
      user1FeeFines: [],
      user2FeeFines: [],
      user3FeeFines: [],
    };
    const feeFineAmount = 10.0;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.createViaApi(testData.servicePoint);

      const ownerBody = {
        owner: 'AutotestOwner' + uuid(),
        servicePointOwner: [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ],
      };

      UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
        testData.owner = ownerResponse;
      });

      cy.then(() => {
        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: testData.owner.id,
        }).then((manualCharge) => {
          testData.manualCharge = manualCharge;

          PaymentMethods.createViaApi(testData.owner.id).then((paymentMethod) => {
            testData.paymentMethod = paymentMethod;

            TransferAccounts.createViaApi({
              ...testData.transferAccount,
              ownerId: testData.owner.id,
            });

            WaiveReasons.createViaApi(testData.waiveReason);
          });
        });
      });

      cy.then(() => {
        cy.createTempUser(
          [
            Permissions.loansAll.gui,
            Permissions.loansView.gui,
            Permissions.uiFeeFines.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersView.gui,
          ],
          'faculty',
        ).then((userProperties) => {
          testData.user1 = userProperties;

          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user1.userId,
            testData.servicePoint.id,
          );
        });

        cy.createTempUser(
          [
            Permissions.loansAll.gui,
            Permissions.loansView.gui,
            Permissions.uiFeeFines.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersView.gui,
          ],
          'faculty',
        ).then((userProperties2) => {
          testData.user2 = userProperties2;

          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user2.userId,
            testData.servicePoint.id,
          );
        });

        cy.createTempUser(
          [
            Permissions.loansAll.gui,
            Permissions.loansView.gui,
            Permissions.uiFeeFines.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersView.gui,
          ],
          'faculty',
        ).then((userProperties3) => {
          testData.user3 = userProperties3;

          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user3.userId,
            testData.servicePoint.id,
          );
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.user1FeeFines.forEach((feeFine) => {
        NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
      });
      testData.user2FeeFines.forEach((feeFine) => {
        NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
      });
      testData.user3FeeFines.forEach((feeFine) => {
        NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
      });
      WaiveReasons.deleteViaApi(testData.waiveReason.id);
      TransferAccounts.deleteViaApi(testData.transferAccount.id);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.manualCharge.id);
      UsersOwners.deleteViaApi(testData.owner.id);
      UserEdit.changeServicePointPreferenceViaApi(testData.user1.userId, [
        testData.servicePoint.id,
      ]);
      Users.deleteViaApi(testData.user1.userId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user2.userId, [
        testData.servicePoint.id,
      ]);
      Users.deleteViaApi(testData.user2.userId);
      UserEdit.changeServicePointPreferenceViaApi(testData.user3.userId, [
        testData.servicePoint.id,
      ]);
      Users.deleteViaApi(testData.user3.userId);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
    });

    it(
      'C17157 Verify that library staff cannot cancel a fee/fine as an error for patron if fee/fine has been partially paid/waived/transferred (vega)',
      { tags: ['extendedPath', 'vega', 'C17157'] },
      () => {
        // Login as the test user
        cy.login(testData.user1.username, testData.user1.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          // Test waived fee/fines
          const feeFine1 = {
            id: uuid(),
            ownerId: testData.owner.id,
            feeFineId: testData.manualCharge.id,
            amount: feeFineAmount,
            userId: testData.user1.userId,
            feeFineType: testData.manualCharge.feeFineType,
            feeFineOwner: testData.owner.owner,
            createdAt: testData.servicePoint.id,
            dateAction: moment.utc().format(),
            source: adminSourceRecord,
          };

          NewFeeFine.createViaApi(feeFine1).then((accountId) => {
            testData.user1FeeFines.push({ id: accountId });

            const partialWaiveBody = {
              amount: 4.0,
              paymentMethod: testData.waiveReason.nameReason,
              notifyPatron: false,
              servicePointId: testData.servicePoint.id,
              userName: adminSourceRecord,
            };

            WaiveFeeFineModal.waiveFeeFineViaApi(partialWaiveBody, accountId).then(() => {
              const feeFine2 = {
                id: uuid(),
                ownerId: testData.owner.id,
                feeFineId: testData.manualCharge.id,
                amount: feeFineAmount,
                userId: testData.user1.userId,
                feeFineType: testData.manualCharge.feeFineType,
                feeFineOwner: testData.owner.owner,
                createdAt: testData.servicePoint.id,
                dateAction: moment.utc().format(),
                source: adminSourceRecord,
              };

              NewFeeFine.createViaApi(feeFine2).then((accountId2) => {
                testData.user1FeeFines.push({ id: accountId2 });

                const fullWaiveBody = {
                  amount: feeFineAmount,
                  paymentMethod: testData.waiveReason.nameReason,
                  notifyPatron: false,
                  servicePointId: testData.servicePoint.id,
                  userName: adminSourceRecord,
                };

                WaiveFeeFineModal.waiveFeeFineViaApi(fullWaiveBody, accountId2).then(() => {
                  UsersSearchPane.searchByUsername(testData.user1.username);
                  UsersSearchPane.selectUserFromList(testData.user1.username);
                  UsersCard.waitLoading();
                  UsersCard.openFeeFines();
                  UsersCard.viewAllFeesFines();
                  UserAllFeesFines.waitLoading();

                  UserAllFeesFines.goToOpenFeeFines();
                  cy.wait(500);

                  UserAllFeesFines.verifyFeeFineCount(1);
                  UserAllFeesFines.verifyPaymentStatus(0, 'Waived partially');

                  UserAllFeesFines.checkErrorEllipsisDisabled(0);

                  UserAllFeesFines.clickOnRowByIndex(0);
                  FeeFineDetails.waitLoading();
                  FeeFineDetails.checkFeeFineLatestPaymentStatus('Waived partially');
                  FeeFineDetails.checkFeeFineRemainingAmount('$6.00');

                  FeeFineDetails.openActions();
                  FeeFineDetails.verifyErrorButtonDisabled();
                  FeeFineDetails.closeDetails();

                  UserAllFeesFines.goToClosedFeesFines();
                  cy.wait(500);

                  UserAllFeesFines.verifyFeeFineCount(1);
                  UserAllFeesFines.verifyPaymentStatus(0, 'Waived fully');

                  UserAllFeesFines.checkErrorEllipsisDisabled(0);

                  UserAllFeesFines.clickOnRowByIndex(0);
                  FeeFineDetails.waitLoading();
                  FeeFineDetails.checkFeeFineLatestPaymentStatus('Waived fully');

                  FeeFineDetails.openActions();
                  FeeFineDetails.verifyErrorButtonDisabled();

                  // Test paid fee/fines
                  cy.visit(TopMenu.usersPath);
                  UsersSearchPane.waitLoading();

                  const feeFine3 = {
                    id: uuid(),
                    ownerId: testData.owner.id,
                    feeFineId: testData.manualCharge.id,
                    amount: feeFineAmount,
                    userId: testData.user2.userId,
                    feeFineType: testData.manualCharge.feeFineType,
                    feeFineOwner: testData.owner.owner,
                    createdAt: testData.servicePoint.id,
                    dateAction: moment.utc().format(),
                    source: adminSourceRecord,
                  };

                  NewFeeFine.createViaApi(feeFine3).then((accountId3) => {
                    testData.user2FeeFines.push({ id: accountId3 });

                    const partialPayBody = {
                      amount: 4.0,
                      paymentMethod: testData.paymentMethod.name,
                      notifyPatron: false,
                      servicePointId: testData.servicePoint.id,
                      userName: adminSourceRecord,
                    };

                    PayFeeFine.payFeeFineViaApi(partialPayBody, accountId3).then(() => {
                      const feeFine4 = {
                        id: uuid(),
                        ownerId: testData.owner.id,
                        feeFineId: testData.manualCharge.id,
                        amount: feeFineAmount,
                        userId: testData.user2.userId,
                        feeFineType: testData.manualCharge.feeFineType,
                        feeFineOwner: testData.owner.owner,
                        createdAt: testData.servicePoint.id,
                        dateAction: moment.utc().format(),
                        source: adminSourceRecord,
                      };

                      NewFeeFine.createViaApi(feeFine4).then((accountId4) => {
                        testData.user2FeeFines.push({ id: accountId4 });

                        const fullPayBody = {
                          amount: feeFineAmount,
                          paymentMethod: testData.paymentMethod.name,
                          notifyPatron: false,
                          servicePointId: testData.servicePoint.id,
                          userName: adminSourceRecord,
                        };

                        PayFeeFine.payFeeFineViaApi(fullPayBody, accountId4).then(() => {
                          UsersSearchPane.searchByUsername(testData.user2.username);
                          UsersSearchPane.selectUserFromList(testData.user2.username);
                          UsersCard.waitLoading();
                          UsersCard.openFeeFines();
                          UsersCard.viewAllFeesFines();
                          UserAllFeesFines.waitLoading();

                          UserAllFeesFines.goToOpenFeeFines();
                          cy.wait(500);

                          UserAllFeesFines.verifyFeeFineCount(1);
                          UserAllFeesFines.verifyPaymentStatus(0, 'Paid partially');

                          UserAllFeesFines.checkErrorEllipsisDisabled(0);

                          UserAllFeesFines.clickOnRowByIndex(0);
                          FeeFineDetails.waitLoading();
                          FeeFineDetails.checkFeeFineLatestPaymentStatus('Paid partially');
                          FeeFineDetails.checkFeeFineRemainingAmount('$6.00');

                          FeeFineDetails.openActions();
                          FeeFineDetails.verifyErrorButtonDisabled();
                          FeeFineDetails.closeDetails();

                          UserAllFeesFines.goToClosedFeesFines();
                          cy.wait(500);

                          UserAllFeesFines.verifyFeeFineCount(1);
                          UserAllFeesFines.verifyPaymentStatus(0, 'Paid fully');

                          UserAllFeesFines.checkErrorEllipsisDisabled(0);

                          UserAllFeesFines.clickOnRowByIndex(0);
                          FeeFineDetails.waitLoading();
                          FeeFineDetails.checkFeeFineLatestPaymentStatus('Paid fully');

                          FeeFineDetails.openActions();
                          FeeFineDetails.verifyErrorButtonDisabled();

                          // Test transferred fee/fines
                          cy.visit(TopMenu.usersPath);
                          UsersSearchPane.waitLoading();

                          const feeFine5 = {
                            id: uuid(),
                            ownerId: testData.owner.id,
                            feeFineId: testData.manualCharge.id,
                            amount: feeFineAmount,
                            userId: testData.user3.userId,
                            feeFineType: testData.manualCharge.feeFineType,
                            feeFineOwner: testData.owner.owner,
                            createdAt: testData.servicePoint.id,
                            dateAction: moment.utc().format(),
                            source: adminSourceRecord,
                          };

                          NewFeeFine.createViaApi(feeFine5).then((accountId5) => {
                            testData.user3FeeFines.push({ id: accountId5 });

                            const partialTransferBody = {
                              amount: 4.0,
                              paymentMethod: testData.transferAccount.accountName,
                              notifyPatron: false,
                              servicePointId: testData.servicePoint.id,
                              userName: adminSourceRecord,
                            };

                            TransferFeeFine.transferFeeFineViaApi(
                              partialTransferBody,
                              accountId5,
                            ).then(() => {
                              const feeFine6 = {
                                id: uuid(),
                                ownerId: testData.owner.id,
                                feeFineId: testData.manualCharge.id,
                                amount: feeFineAmount,
                                userId: testData.user3.userId,
                                feeFineType: testData.manualCharge.feeFineType,
                                feeFineOwner: testData.owner.owner,
                                createdAt: testData.servicePoint.id,
                                dateAction: moment.utc().format(),
                                source: adminSourceRecord,
                              };

                              NewFeeFine.createViaApi(feeFine6).then((accountId6) => {
                                testData.user3FeeFines.push({ id: accountId6 });

                                const fullTransferBody = {
                                  amount: feeFineAmount,
                                  paymentMethod: testData.transferAccount.accountName,
                                  notifyPatron: false,
                                  servicePointId: testData.servicePoint.id,
                                  userName: adminSourceRecord,
                                };

                                TransferFeeFine.transferFeeFineViaApi(
                                  fullTransferBody,
                                  accountId6,
                                ).then(() => {
                                  UsersSearchPane.searchByUsername(testData.user3.username);
                                  UsersSearchPane.selectUserFromList(testData.user3.username);
                                  UsersCard.waitLoading();
                                  UsersCard.openFeeFines();
                                  UsersCard.viewAllFeesFines();
                                  UserAllFeesFines.waitLoading();

                                  UserAllFeesFines.goToOpenFeeFines();
                                  cy.wait(500);

                                  UserAllFeesFines.verifyFeeFineCount(1);
                                  UserAllFeesFines.verifyPaymentStatus(0, 'Transferred partially');

                                  UserAllFeesFines.checkErrorEllipsisDisabled(0);

                                  UserAllFeesFines.clickOnRowByIndex(0);
                                  FeeFineDetails.waitLoading();
                                  FeeFineDetails.checkFeeFineLatestPaymentStatus(
                                    'Transferred partially',
                                  );
                                  FeeFineDetails.checkFeeFineRemainingAmount('$6.00');

                                  FeeFineDetails.openActions();
                                  FeeFineDetails.verifyErrorButtonDisabled();
                                  FeeFineDetails.closeDetails();

                                  UserAllFeesFines.goToClosedFeesFines();
                                  cy.wait(500);

                                  UserAllFeesFines.verifyFeeFineCount(1);
                                  UserAllFeesFines.verifyPaymentStatus(0, 'Transferred fully');

                                  UserAllFeesFines.checkErrorEllipsisDisabled(0);

                                  UserAllFeesFines.clickOnRowByIndex(0);
                                  FeeFineDetails.waitLoading();
                                  FeeFineDetails.checkFeeFineLatestPaymentStatus(
                                    'Transferred fully',
                                  );

                                  FeeFineDetails.openActions();
                                  FeeFineDetails.verifyErrorButtonDisabled();
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      },
    );
  });
});
