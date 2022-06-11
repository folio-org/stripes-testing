import TestTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import Helper from '../../../../support/fragments/finance/financeHelper';
import NewServicePoint from '../../../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import LoanPolicyActions from '../../../../support/fragments/circulation/loan-policy';
import { CY_ENV, LOST_ITEM_FEES_POLICY_NAMES, NOTICE_POLICY_NAMES, OVERDUE_FINE_POLICY_NAMES, REQUEST_POLICY_NAMES } from '../../../../support/constants';
import FixedDueDateSchedules from '../../../../support/fragments/circulation/fixedDueDateSchedules';
import СheckOutActions from '../../../../support/fragments/check-out-actions/check-out-actions';
import LimitCheckOut from '../../../../support/fragments/checkout/modals/limitCheckOut';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import UsersEditPage from '../../../../support/fragments/users/usersEditPage';
import Users from '../../../../support/fragments/users/users';

describe('ui-users:', () => {
  let user = {};
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  let servicePoint;
  let limitTstInstanceIds;
  let testInstanceIds;
  let loanPolicy;
  let materialType;
  let limitLoanTypeId;
  let loanTypeId;
  const limitTestItems = [];
  const testItems = [];
  let rulesDefaultString;
  let initialCircRules;
  const limitOfItem = 2;

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getMaterialTypes({ limit: 1 })
          .then(({ id }) => {
            materialType = { id };
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Course reserves"' })
          .then((body) => {
            limitLoanTypeId = body[0].id;
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Can circulate"' })
          .then((body) => {
            loanTypeId = body[0].id;
          });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getCirculationRules()
          .then(rules => {
            initialCircRules = rules.rulesAsText;
          });
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
            limitTstInstanceIds = specialInstanceIds;
          })
        // create loan policy
          .then(() => {
            FixedDueDateSchedules.createViaApi()
              .then((schedule) => {
                LoanPolicyActions.createApi(LoanPolicyActions.getDefaultLoanPolicy(limitOfItem, schedule.body.id))
                  .then((policy) => {
                    loanPolicy = policy;
                  });
              });
            cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.ALLOW_ALL}"` });
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
            const policy = `l ${loanPolicy.id} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
            const priority = 'priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line';
            const newRule = `${priority}\nfallback-policy: ${policy}\nt ${limitLoanTypeId}: ${policy}`;

            cy.updateCirculationRules({
              rulesAsText: newRule,
            });
          });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
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
      permissions.checkoutCirculatingItems.gui
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        cy.addServicePointToUser([servicePoint.body.id],
          user.userId, servicePoint.body.id);
      })
      .then(() => {
        cy.login(user.username, user.password);
      });
  });

  after(() => {
    limitTestItems.forEach(item => {
      CheckInActions.createItemCheckinApi({
        itemBarcode: item.barcode,
        servicePointId: servicePoint.body.id,
        checkInDate: '2021-09-30T16:14:50.444Z',
      });
    });
    cy.wrap(limitTstInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecord(holdingsId.id);
      });
    })).then(() => {
      cy.deleteInstanceApi(limitTstInstanceIds.instanceId);
    });
    testItems.forEach(item => {
      CheckInActions.createItemCheckinApi({
        itemBarcode: item.barcode,
        servicePointId: servicePoint.body.id,
        checkInDate: '2021-09-30T16:14:50.444Z',
      });
    });
    cy.wrap(testInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecord(holdingsId.id);
      });
    })).then(() => {
      cy.deleteInstanceApi(testInstanceIds.instanceId);
    });
    cy.updateCirculationRules({
      rulesAsText: rulesDefaultString,
    });
    cy.deleteLoanPolicy(loanPolicy.id);
    cy.wrap(UsersEditPage.changeServicePointPreferenceViaApi(user.userId, [servicePoint.body.id]))
      .then(() => {
        cy.deleteServicePoint(servicePoint.body.id);
        Users.deleteViaApi(user.userId);
      });
  });

  it('C9277 Verify that maximum number of items borrowed for loan type (e.g. course reserve) limit works', { tags: [TestTypes.smoke] }, () => {
    limitTestItems.forEach((item) => {
      console.log(item.barcode);
    });
    cy.visit(TopMenu.checkOutPath);
    limitTestItems.forEach((item) => {
      console.log(user.barcode);
      СheckOutActions.checkOutItemUser(user.barcode, item.barcode);
    });
    testItems.forEach((item) => {
      console.log(item.barcode);
    });
    LimitCheckOut.verifyErrorMessage(limitOfItem);
    LimitCheckOut.cancelModal();
    testItems.forEach((item) => {
      СheckOutActions.checkOutItemUser(user.barcode, item.barcode);
    });
  });
});
