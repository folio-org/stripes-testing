import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import LimitCheckOut from '../../support/fragments/checkout/modals/limitCheckOut';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicyActions from '../../support/fragments/circulation/loan-policy';
import Helper from '../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe(
    'Item Blocks',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user = {};
      let instanceTitle;
      let servicePoint;
      let limitTestInstanceIds;
      let testInstanceIds;
      let loanPolicyForCourseReserves;
      let loanPolicyForReadingRoom;
      let materialType;
      let limitLoanTypeId;
      let loanTypeId;
      const limitTestItems = [];
      const testItems = [];
      const limitOfItem = 2;
      const addedRules = [];

      beforeEach(() => {
        instanceTitle = `autotest title ${getRandomPostfix()}`;

        cy.getAdminToken()
          .then(() => {
            cy.getDefaultMaterialType().then(({ id }) => {
              materialType = { id };
            });
            cy.getLoanTypes({ limit: 1, query: 'name="Course reserves"' }).then((body) => {
              limitLoanTypeId = body[0].id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name="Reading Room"' }).then((body) => {
              loanTypeId = body[0].id;
            });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
          })
          .then(() => {
            const getTestItem = (type) => {
              const defaultItem = {
                barcode: Helper.getRandomBarcode(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: type },
                materialType: { id: materialType.id },
              };
              return defaultItem;
            };

            limitTestItems.push(getTestItem(limitLoanTypeId));
            limitTestItems.push(getTestItem(limitLoanTypeId));
            limitTestItems.push(getTestItem(limitLoanTypeId));
            testItems.push(getTestItem(loanTypeId));
            testItems.push(getTestItem(loanTypeId));

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: Cypress.env('locations')[0].id,
                },
              ],
              items: limitTestItems,
            }).then((specialInstanceIds) => {
              limitTestInstanceIds = specialInstanceIds;
            });
            // create loan policies and rules
            LoanPolicyActions.createViaApi(
              LoanPolicyActions.getDefaultRollingLoanPolicy(limitOfItem),
            ).then((firstLoanPolicy) => {
              loanPolicyForCourseReserves = firstLoanPolicy;
              LoanPolicyActions.createViaApi(LoanPolicyActions.getDefaultRollingLoanPolicy()).then(
                (secondLoanPolicy) => {
                  loanPolicyForReadingRoom = secondLoanPolicy;

                  CirculationRules.addRuleViaApi(
                    { t: limitLoanTypeId },
                    { l: loanPolicyForCourseReserves.id },
                  ).then((newRule) => {
                    addedRules.push(newRule);
                  });

                  CirculationRules.addRuleViaApi(
                    { t: loanTypeId },
                    { l: loanPolicyForReadingRoom.id },
                  ).then((newRule) => {
                    addedRules.push(newRule);
                  });
                },
              );
            });

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `autotest title ${getRandomPostfix()}`,
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: Cypress.env('locations')[0].id,
                },
              ],
              items: testItems,
            }).then((specialInstanceIds) => {
              testInstanceIds = specialInstanceIds;
            });
          });

        cy.createTempUser([
          permissions.checkoutCirculatingItems.gui,
          permissions.uiCirculationSettingsOtherSettings.gui,
        ])
          .then((userProperties) => {
            user = userProperties;
            servicePoint = NewServicePoint.getDefaultServicePoint();
            ServicePoints.createViaApi(servicePoint);
            UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: SettingsMenu.circulationOtherSettingsPath,
              waiter: OtherSettings.waitLoading,
            });
            OtherSettings.waitLoading();
            OtherSettings.selectPatronIdsForCheckoutScanning(['Barcode'], '5');
          });
      });

      afterEach(() => {
        cy.getAdminToken();
        limitTestItems.forEach((item) => {
          CheckInActions.checkinItemViaApi({
            itemBarcode: item.barcode,
            servicePointId: servicePoint.id,
            checkInDate: new Date().toISOString(),
          });
        });
        cy.wrap(
          limitTestInstanceIds.holdingIds.forEach((holdingsId) => {
            cy.wrap(
              holdingsId.itemIds.forEach((itemId) => {
                cy.deleteItemViaApi(itemId);
              }),
            ).then(() => {
              cy.deleteHoldingRecordViaApi(holdingsId.id);
            });
          }),
        ).then(() => {
          InventoryInstance.deleteInstanceViaApi(limitTestInstanceIds.instanceId);
        });
        testItems.forEach((item) => {
          CheckInActions.checkinItemViaApi({
            itemBarcode: item.barcode,
            servicePointId: servicePoint.id,
            checkInDate: new Date().toISOString(),
          });
        });
        cy.wrap(
          testInstanceIds.holdingIds.forEach((holdingsId) => {
            cy.wrap(
              holdingsId.itemIds.forEach((itemId) => {
                cy.deleteItemViaApi(itemId);
              }),
            ).then(() => {
              cy.deleteHoldingRecordViaApi(holdingsId.id);
            });
          }),
        ).then(() => {
          InventoryInstance.deleteInstanceViaApi(testInstanceIds.instanceId);
        });
        cy.deleteLoanPolicy(loanPolicyForCourseReserves.id);
        cy.deleteLoanPolicy(loanPolicyForReadingRoom.id);
        cy.wrap(addedRules).each((rule) => {
          CirculationRules.deleteRuleViaApi(rule);
        });
        UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id]).then(() => {
          ServicePoints.deleteViaApi(servicePoint.id);
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C9277 Verify that maximum number of items borrowed for loan type (e.g. course reserve) limit works (volaris)',
        { tags: ['smoke', 'volaris', 'shiftLeft', 'C9277'] },
        () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
          cy.wait(5000);
          CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[0].barcode);
          CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[1].barcode);
          testItems.forEach((item) => {
            CheckOutActions.checkOutItemUser(user.barcode, item.barcode);
          });
          CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[2].barcode);
          LimitCheckOut.verifyErrorMessage(2);
          LimitCheckOut.cancelModal();
        },
      );
    },
  );
});
