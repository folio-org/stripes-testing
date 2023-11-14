import moment from 'moment';
import uuid from 'uuid';
import devTeams from '../../../../support/dictionary/devTeams';
import TestTypes from '../../../../support/dictionary/testTypes';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import generateItemBarcode from '../../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  CY_ENV,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  LIBRARY_DUE_DATE_MANAGMENT,
  LOAN_PROFILE,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import FixedDueDateSchedules from '../../../../support/fragments/circulation/fixedDueDateSchedules';
import Checkout from '../../../../support/fragments/checkout/checkout';
import Loans from '../../../../support/fragments/loans/loansPage';
import TopMenu from '../../../../support/fragments/topMenu';
import CheckinActions from '../../../../support/fragments/check-in-actions/checkInActions';
import Users from '../../../../support/fragments/users/users';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import loanPolicy from '../../../../support/fragments/circulation/loan-policy';

let userData = {};
let materialTypeId;
let mySchedule;
let addedRule;
let patronGroupId;
let servicePointId;
const USER_BARCODE = uuid();
const ITEM_BARCODE = generateItemBarcode();
const fromDate = moment.utc().subtract(2, 'days');
const toDate = moment.utc().add(2, 'days');
const dueDate = moment.utc().add(2, 'days');
const newToDate = moment.utc().subtract(1, 'days');
const dateFallsMessage = 'renewal date falls outside of date ranges in fixed loan policy';
let sourceId;
const loanPolicyBody = {
  id: uuid(),
  name: `renewable_${getRandomPostfix()}`,
  loanable: true,
  loansPolicy: {
    closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
    fixedDueDateScheduleId: '',
    profileId: LOAN_PROFILE.FIXED,
  },
  renewable: true,
  renewalsPolicy: {
    unlimited: true,
  },
};

describe('ui-circulation-settings: Fixed due date schedules', () => {
  before(() => {
    cy.login(Cypress.env(CY_ENV.DIKU_LOGIN), Cypress.env(CY_ENV.DIKU_PASSWORD));
    cy.getToken(Cypress.env(CY_ENV.DIKU_LOGIN), Cypress.env(CY_ENV.DIKU_PASSWORD))
      .then(() => {
        ServicePoints.getViaApi({ pickupLocation: true }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        });
        cy.getInstanceTypes({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingsSources) => {
          sourceId = holdingsSources[0].id;
        });
        cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` });
        cy.getMaterialTypes({ query: `name="${MATERIAL_TYPE_NAMES.MICROFORM}"` }).then(
          (materilaTypes) => {
            materialTypeId = materilaTypes.id;
          },
        );
        cy.getUserGroups({ limit: 1 }).then((patronGroups) => {
          patronGroupId = patronGroups;
        });
      })
      .then(() => {
        Users.createViaApi({
          active: true,
          barcode: USER_BARCODE,
          personal: {
            preferredContactTypeId: '002',
            lastName: `Test user ${getRandomPostfix()}`,
            email: 'test@folio.org',
          },
          patronGroup: patronGroupId,
          departments: [],
        }).then((user) => {
          userData = { ...user };
        });
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env(CY_ENV.INSTANCE_TYPES)[0].id,
            title: `Automation test instance ${getRandomPostfix()}`,
          },
          holdings: [
            {
              holdingsTypeId: Cypress.env(CY_ENV.HOLDINGS_TYPES)[0].id,
              permanentLocationId: Cypress.env(CY_ENV.LOCATION)[0].id,
              sourceId,
            },
          ],
          items: [
            [
              {
                barcode: ITEM_BARCODE,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env(CY_ENV.LOAN_TYPES)[0].id },
                materialType: { id: materialTypeId },
              },
            ],
          ],
        }).then(() => {
          cy.createFixedDueDateSchedule({
            schedules: [
              {
                from: fromDate.format(),
                to: toDate.format(),
                due: dueDate.format(),
              },
            ],
          })
            .then((schedule) => {
              mySchedule = schedule;
              loanPolicyBody.loansPolicy.fixedDueDateScheduleId = mySchedule.id;
            })
            .then(() => {
              loanPolicy.createViaApi(loanPolicyBody);
              CirculationRules.addRuleViaApi({ g: patronGroupId }, { l: loanPolicyBody.id }).then(
                (newRule) => {
                  addedRule = newRule;
                },
              );
              Checkout.checkoutItemViaApi({
                servicePointId,
                itemBarcode: ITEM_BARCODE,
                userBarcode: USER_BARCODE,
              });
            });
        });
      });
  });

  after(() => {
    cy.getAdminToken();
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: moment.utc().format(),
    }).then(() => {
      Users.deleteViaApi(userData.id);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${ITEM_BARCODE}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      CirculationRules.deleteRuleViaApi(addedRule);
      cy.deleteLoanPolicy(loanPolicyBody.id).then(() => {
        cy.deleteFixedDueDateSchedule(mySchedule.id);
      });
    });
  });

  it(
    'C641: Test renewing item using a fixed due date loan profile where the fixed due date schedule date range does not cover the test date (vega)',
    { tags: [TestTypes.smoke, devTeams.vega] },
    () => {
      cy.visit(SettingsMenu.circulationFixedDueDateSchedulesPath);
      FixedDueDateSchedules.editSchedule(mySchedule.name, {
        description: mySchedule.description,
        schedules: [
          {
            from: fromDate,
            to: newToDate,
            due: dueDate,
          },
        ],
      });
      cy.visit(TopMenu.checkOutPath);
      Checkout.checkUserOpenLoans({ barcode: userData.barcode, id: userData.id });
      Loans.checkLoanPolicy(loanPolicyBody.name);
      Loans.renewalMessageCheck(dateFallsMessage);
    },
  );
});
