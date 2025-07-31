import permissions from '../../../support/dictionary/permissions';
import AppPaths from '../../../support/fragments/app-paths';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicyActions from '../../../support/fragments/circulation/loan-policy';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { getNewItem } from '../../../support/fragments/inventory/item';
import LoansPage from '../../../support/fragments/loans/loansPage';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OverrideAndRenewModal from '../../../support/fragments/users/loans/overrideAndRenewModal';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Loans from '../../../support/fragments/users/userDefaultObjects/loans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Loans', () => {
  describe(
    'Loans: Renewals',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let loanType;
      let newFirstItemData;
      let newSecondItemData;
      let servicePoint;
      let loanPolicy;
      let materialType;
      let holdingsSourceId;
      let addedRule;
      let firstUser = {};
      let secondUser = {};
      let firstInstanceIds;
      let secondInstanceIds;
      let defaultLocation;

      beforeEach(() => {
        newFirstItemData = getNewItem();
        newSecondItemData = getNewItem();
        servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

        cy.getAdminToken()
          .then(() => {
            cy.getDefaultMaterialType().then((materialTypes) => {
              materialType = materialTypes;
            });
            InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
              holdingsSourceId = source.id;
            });
            cy.getInstanceTypes({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            cy.createLoanType({ name: `autotest_loan_type${getRandomPostfix()}` }).then((type) => {
              loanType = type;
            });
            ServicePoints.createViaApi(servicePoint).then(() => {
              defaultLocation = Location.getDefaultLocation(servicePoint.id);
              Location.createViaApi(defaultLocation);
            });
          })
          .then(() => {
            LoanPolicyActions.createViaApi({
              loanable: true,
              loansPolicy: {
                closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
                period: {
                  duration: 5,
                  intervalId: 'Minutes',
                },
                profileId: 'Rolling',
              },
              name: getTestEntityValue(),
              renewable: true,
              renewalsPolicy: {
                numberAllowed: 0,
                renewFromId: 'SYSTEM_DATE',
              },
            }).then((policy) => {
              loanPolicy = policy;

              CirculationRules.addRuleViaApi({ m: materialType.id }, { l: loanPolicy.id }).then(
                (newRule) => {
                  addedRule = newRule;
                },
              );
            });
          });

        cy.createTempUser([permissions.loansView.gui, permissions.loansRenew.gui]).then(
          ({ username, password, userId, barcode: userBarcode }) => {
            firstUser = {
              username,
              password,
              userId,
            };
            UserEdit.addServicePointViaApi(servicePoint.id, userId).then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: Cypress.env('instanceTypes')[0].id,
                  title: getTestEntityValue(),
                },
                holdings: [
                  {
                    holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                    permanentLocationId: defaultLocation.id,
                    sourceId: holdingsSourceId,
                  },
                ],
                items: [
                  {
                    ...newFirstItemData,
                    permanentLoanType: { id: loanType.id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                ],
              })
                .then((specialInstanceIds) => {
                  firstInstanceIds = specialInstanceIds;
                })
                .then(() => {
                  [newFirstItemData.barcode].forEach((itemBarcode) => {
                    Checkout.checkoutItemViaApi({
                      itemBarcode,
                      userBarcode,
                      servicePointId: servicePoint.id,
                    });
                  });
                });
            });
          },
        );
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
          permissions.loansRenewOverride.gui,
        ]).then(({ username, password, userId, barcode: userBarcode }) => {
          secondUser = {
            username,
            password,
            userId,
          };
          UserEdit.addServicePointViaApi(servicePoint.id, userId).then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: getTestEntityValue(),
              },
              holdings: [
                {
                  holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                  permanentLocationId: defaultLocation.id,
                  sourceId: holdingsSourceId,
                },
              ],
              items: [
                {
                  ...newSecondItemData,
                  permanentLoanType: { id: loanType.id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                },
              ],
            })
              .then((specialInstanceIds) => {
                secondInstanceIds = specialInstanceIds;
              })
              .then(() => {
                [newSecondItemData.barcode].forEach((itemBarcode) => {
                  Checkout.checkoutItemViaApi({
                    itemBarcode,
                    userBarcode,
                    servicePointId: servicePoint.id,
                  });
                });
              });
          });
        });
      });

      afterEach(() => {
        cy.getAdminToken();
        [newFirstItemData, newSecondItemData].forEach((item) => {
          CheckInActions.checkinItemViaApi({
            itemBarcode: item.barcode,
            servicePointId: servicePoint.id,
            checkInDate: new Date().toISOString(),
          });
        });

        cy.wrap(
          firstInstanceIds.holdingIds.forEach((holdingsId) => {
            cy.wrap(
              holdingsId.itemIds.forEach((itemId) => {
                cy.deleteItemViaApi(itemId);
              }),
            ).then(() => {
              cy.deleteHoldingRecordViaApi(holdingsId.id);
            });
          }),
        ).then(() => {
          InventoryInstance.deleteInstanceViaApi(firstInstanceIds.instanceId);
        });
        cy.wrap(
          secondInstanceIds.holdingIds.forEach((holdingsId) => {
            cy.wrap(
              holdingsId.itemIds.forEach((itemId) => {
                cy.deleteItemViaApi(itemId);
              }),
            ).then(() => {
              cy.deleteHoldingRecordViaApi(holdingsId.id);
            });
          }),
        ).then(() => {
          InventoryInstance.deleteInstanceViaApi(secondInstanceIds.instanceId);
        });
        cy.deleteLoanType(loanType.id);
        cy.deleteLoanPolicy(loanPolicy.id);
        CirculationRules.deleteRuleViaApi(addedRule);
        UserEdit.changeServicePointPreferenceViaApi(firstUser.userId, [servicePoint.id]);
        UserEdit.changeServicePointPreferenceViaApi(secondUser.userId, [servicePoint.id]);
        Users.deleteViaApi(firstUser.userId);
        Users.deleteViaApi(secondUser.userId);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          defaultLocation.institutionId,
          defaultLocation.campusId,
          defaultLocation.libraryId,
          defaultLocation.id,
        );
        ServicePoints.deleteViaApi(servicePoint.id);
      });

      it(
        'C569 renewal failure because loan has reached maximum renewals (vega)',
        { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C569', 'eurekaPhase1'] },
        () => {
          cy.login(firstUser.username, firstUser.password, {
            path: AppPaths.getOpenLoansPath(firstUser.userId),
            waiter: LoanDetails.waitLoading,
          });

          LoansPage.renewalMessageCheck('Renew Confirmation');
          LoansPage.checkOverrideButtonHidden();
          LoansPage.closeLoanDetails();

          cy.login(secondUser.username, secondUser.password, {
            path: AppPaths.getOpenLoansPath(secondUser.userId),
            waiter: LoanDetails.waitLoading,
          });

          LoansPage.renewalMessageCheck('Renew Confirmation');
          LoansPage.checkOverrideButtonVisible();
          RenewConfirmationModal.confirmRenewOverrideItem();
          OverrideAndRenewModal.confirmOverrideItem();
          Loans.getLoanDetails(newSecondItemData.barcode);
          LoanDetails.checkStatusCheckedOut();
          LoanDetails.checkRenewalCount();
          LoanDetails.checkAction(0, 'Renewed through override');
        },
      );
    },
  );
});
