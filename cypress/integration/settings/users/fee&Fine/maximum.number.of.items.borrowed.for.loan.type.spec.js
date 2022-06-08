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
import { CY_ENV } from '../../../../support/constants';
import CheckoutActions from '../../../../support/fragments/checkout/checkout';
import FixedDueDateSchedules from '../../../../support/fragments/circulation/fixedDueDateSchedules';

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


  it('C9277 Verify that maximum number of items borrowed for loan type (e.g. course reserve) limit works', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.checkOutPath);
    testItems.forEach((barcode) => {
      CheckoutActions.checkOutItem(userBarcode, barcode);
    });
  });
});
