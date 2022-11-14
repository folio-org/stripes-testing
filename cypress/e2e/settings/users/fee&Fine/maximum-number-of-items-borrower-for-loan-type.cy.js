import TestTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import Helper from '../../../../support/fragments/finance/financeHelper';
import NewServicePoint from '../../../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import ServicePoint from '../../../../support/fragments/servicePoint/servicePoint';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import LoanPolicyActions from '../../../../support/fragments/circulation/loan-policy';
import { CY_ENV, LOST_ITEM_FEES_POLICY_NAMES, NOTICE_POLICY_NAMES, OVERDUE_FINE_POLICY_NAMES, REQUEST_POLICY_NAMES } from '../../../../support/constants';
import CheckOutActions from '../../../../support/fragments/check-out-actions/check-out-actions';
import LimitCheckOut from '../../../../support/fragments/checkout/modals/limitCheckOut';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../../../support/dictionary/devTeams';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import OtherSettings from '../../../../support/fragments/settings/circulation/otherSettings';

describe('ui-users:', () => {
  let user = {};
  const instanceTitle = `autotest title ${getRandomPostfix()}`;
  let servicePoint;
  let limitTestInstanceIds;
  let testInstanceIds;
  let loanPolicyForCourseReserves;
  let materialType;
  let limitLoanTypeId;
  let loanTypeId;
  const limitTestItems = [];
  const testItems = [];
  let rulesDefaultString;
  const limitOfItem = 2;

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getMaterialTypes({ query: 'name:"book"' })
          .then(({ id }) => {
            materialType = { id };
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Course reserves"' })
          .then((body) => {
            limitLoanTypeId = body[0].id;
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Reading Room"' })
          .then((body) => {
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
            status:  { name: 'Available' },
            permanentLoanType: { id:type },
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
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
          }],
          items: limitTestItems
        })
          .then(specialInstanceIds => {
            limitTestInstanceIds = specialInstanceIds;
          })
        // create loan policy
          .then(() => {
            LoanPolicyActions.createApi(LoanPolicyActions.getDefaultLoanPolicy(limitOfItem))
              .then((policy) => {
                loanPolicyForCourseReserves = policy;
              });
            cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.HOLD_ONLY}"` });
            cy.getNoticePolicy({ query: `name=="${NOTICE_POLICY_NAMES.SEND_NO_NOTICES}"` });
            cy.getOverdueFinePolicy({ query: `name=="${OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY}"` });
            cy.getLostItemFeesPolicy({ query: `name=="${LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY}"` });
            cy.getCirculationRules()
              .then(rules => {
                rulesDefaultString = rules.rulesAsText;
              });
          })
        // create circulation rules
          .then(() => {
            const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
            const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
            const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
            const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
            const policy = `l ${loanPolicyForCourseReserves.id} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
            const priority = 'priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line';
            const newRule = `${priority}\nfallback-policy: ${policy}\nt ${limitLoanTypeId}: ${policy}`;

            cy.updateCirculationRules({
              rulesAsText: newRule,
            });
          });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: `autotest title ${getRandomPostfix()}`,
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
          }],
          items: testItems
        })
          .then(specialInstanceIds => {
            testInstanceIds = specialInstanceIds;
          });
      });

    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui,
      permissions.uiCirculationSettingsOtherSettings.gui
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaultServicePoint();
        ServicePoints.createViaApi(servicePoint);
        UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
      })
      .then(() => {
        cy.login(user.username, user.password);

        cy.visit(SettingsMenu.circulationOtherSettingsPath);
        OtherSettings.waitLoading();
        OtherSettings.selectPatronIdsForCheckoutScanning(['Barcode'], '1');
      });
  });

  after(() => {
    limitTestItems.forEach(item => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    cy.wrap(limitTestInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(limitTestInstanceIds.instanceId);
    });
    testItems.forEach(item => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    cy.wrap(testInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(testInstanceIds.instanceId);
    });
    cy.updateCirculationRules({
      rulesAsText: rulesDefaultString,
    });
    cy.deleteLoanPolicy(loanPolicyForCourseReserves.id);
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id])
      .then(() => {
        ServicePoint.deleteViaApi(servicePoint.id);
        Users.deleteViaApi(user.userId);
      });
  });

  it('C9277 Verify that maximum number of items borrowed for loan type (e.g. course reserve) limit works (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[0].barcode);
    CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[1].barcode);
    testItems.forEach((item) => {
      CheckOutActions.checkOutItemUser(user.barcode, item.barcode);
    });
    CheckOutActions.checkOutItemUser(user.barcode, limitTestItems[2].barcode);
    LimitCheckOut.verifyErrorMessage(1);
    LimitCheckOut.cancelModal();
  });
});
