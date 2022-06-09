// import uuid from 'uuid';
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

describe('ui-users:', () => {
  let user = {};
  let userBarcode = '';
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  let servicePoint;
  let testInstanceIds;
  let loanPolicy;
  let materialType;
  let loanTypeId;
  const testItems = [];
  let rulesDefaultString;

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getMaterialTypes({ limit: 1 })
          .then(({ id }) => {
            materialType = { id };
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Course reserves"' })
          .then((body) => {
            loanTypeId = body[0].id;
          });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
      })
      .then(() => {
        const getTestItem = () => {
          const defaultItem = {
            barcode: Helper.getRandomBarcode(),
            status:  { name: 'Available' },
            permanentLoanType: { id:loanTypeId },
            materialType: { id: materialType.id },
          };
          return defaultItem;
        };
        testItems.push(getTestItem());
        testItems.push(getTestItem());
        testItems.push(getTestItem());

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
          }],
          items: testItems,
        })
          .then(specialInstanceIds => {
            testInstanceIds = specialInstanceIds;
          })
        // create loan policy
          .then(() => {
            FixedDueDateSchedules.createViaApi()
              .then((schedule) => {
                LoanPolicyActions.createApi(LoanPolicyActions.getDefaultLoanPolicy(2, schedule.body.id))
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
            const newRule = `${priority}\nfallback-policy: ${policy}\nt ${loanTypeId}: ${policy}`;

            cy.updateCirculationRules({
              rulesAsText: newRule,
            });
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
        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = users[0].barcode;
          });
      });
  });

  /* after(() => {
    checkinActions.createItemCheckinApi({
      itemBarcode: itemData.barcode,
      servicePointId,
      checkInDate: moment.utc().format(),
    })
      .then(() => {
        cy.deleteUser(renewUserData.id);
        cy.deleteUser(renewOverrideUserData.id);
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemData.barcode}"` })
          .then((instance) => {
            cy.deleteItem(instance.items[0].id);
            cy.deleteHoldingRecord(instance.holdings[0].id);
            cy.deleteInstanceApi(instance.id);
          });
        cy.updateCirculationRules({
          rulesAsText: initialCircRules,
        });
        cy.deleteLoanPolicy(LOAN_POLICY_ID);
      });
  }); */

  it('C9277 Verify that maximum number of items borrowed for loan type (e.g. course reserve) limit works', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.checkOutPath);
    testItems.forEach((item) => {
      СheckOutActions.checkOutItem(userBarcode, item.barcode);
    });
  });
});
