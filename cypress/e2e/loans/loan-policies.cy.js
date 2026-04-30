import moment from 'moment';
import uuid from 'uuid';

import { LOAN_PROFILE } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import { createCalendar, deleteCalendar } from '../../support/fragments/calendar/calendar';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../support/fragments/loans/loansPage';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import { getTestEntityValue } from '../../support/utils/stringTools';

// ─── Shared constants ──────────────────────────────────────────────────────────
export const CLOSED_LIBRARY_DUE_DATE_MANAGEMENT = {
  CURRENT_DUE_DATE: 'CURRENT_DUE_DATE',
  CURRENT_DUE_DATE_TIME: 'CURRENT_DUE_DATE_TIME',
  END_OF_THE_CURRENT_SERVICE_POINT_HOURS: 'END_OF_THE_CURRENT_SERVICE_POINT_HOURS',
  BEGINNING_OF_THE_NEXT_OPEN_SERVICE_POINT_HOURS: 'BEGINNING_OF_THE_NEXT_OPEN_SERVICE_POINT_HOURS',
  END_OF_THE_PREVIOUS_OPEN_DAY: 'END_OF_THE_PREVIOUS_OPEN_DAY',
  END_OF_THE_NEXT_OPEN_DAY: 'END_OF_THE_NEXT_OPEN_DAY',
};
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';
const DEFAULT_START_TIME = '00:00';
/** Opening time for the next day used in all "move to beginning" short-term tests */
const COMMON_PERMISSIONS = [
  Permissions.checkoutAll.gui,
  Permissions.uiUsersView.gui,
  Permissions.uiUsersViewLoans.gui,
];

// ─── Calendar builders ─────────────────────────────────────────────────────────

/**
 * SHORT term — today's SP hours: open 00:00 → now+1h.
 * Checkout is inside open hours; due date (now+Nh, N>1) falls AFTER closing → SP is CLOSED.
 * Exposes _closingTimeAmPm for "Move to end of current SP hours" assertion.
 */
function buildShortTermTodayClosedCalendar({ servicePointId, calendarName }) {
  const todayDayOfWeek = moment.utc().format('dddd').toUpperCase();
  const closingMoment = moment.utc().add(1, 'hour').startOf('hour');
  const closingTime = closingMoment.format(TIME_FORMAT);
  return {
    name: calendarName,
    assignments: [servicePointId],
    startDate: moment.utc().format(DATE_FORMAT),
    endDate: moment.utc().add(7, 'days').format(DATE_FORMAT),
    normalHours: [
      {
        startDay: todayDayOfWeek,
        startTime: DEFAULT_START_TIME,
        endDay: todayDayOfWeek,
        endTime: closingTime,
      },
    ],
    exceptions: [],
    _closingTimeAmPm: closingMoment.format('h:mm A'),
  };
}

// ─── Shared before / after ─────────────────────────────────────────────────────

/**
 * Standard before-hook body.
 * Creates user → service point → calendar → location → instance → loan policy →
 * circulation rule → logs in to Check out app.
 *
 * Private fields prefixed with `_` in the calendarBody (e.g. _closingTimeAmPm) are
 * automatically hoisted onto `ctx` (→ ctx.closingTimeAmPm) for use in it() blocks.
 *
 * @param {object}   ctx            - mutable context shared between before / it / after
 * @param {string}   loanPolicyId   - pre-generated uuid matching the loan policy object
 * @param {Function} calendarBodyFn - calendar builder fn({ servicePointId, calendarName })
 * @param {string}   calendarName   - unique calendar name for this test
 * @param {Function} createPolicyFn - (ctx) => void; creates the loan policy (+ optional fixed schedule)
 */
function setupLoanTest(ctx, { loanPolicyId, calendarBodyFn, calendarName, createPolicyFn }) {
  cy.createTempUser(COMMON_PERMISSIONS).then((userProperties) => {
    ctx.userData = userProperties;

    cy.getAllMaterialTypes({ limit: 1 }).then((materialTypes) => {
      ctx.materialType = materialTypes[0];
      ctx.servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
      ServicePoints.createViaApi(ctx.servicePoint);

      const calendarBody = calendarBodyFn({ servicePointId: ctx.servicePoint.id, calendarName });
      createCalendar(calendarBody, (response) => {
        ctx.calendarId = response.body.id;
        // Hoist _privateFields from calendarBody → ctx (strips the leading underscore)
        Object.keys(calendarBody)
          .filter((k) => k.startsWith('_'))
          .forEach((k) => {
            ctx[k.slice(1)] = calendarBody[k];
          });
      });

      ctx.defaultLocation = Location.getDefaultLocation(ctx.servicePoint.id);
      Locations.createViaApi(ctx.defaultLocation).then((location) => {
        ctx.folioInstance = InventoryInstances.generateFolioInstances({
          count: 1,
          itemsProperties: [{ materialType: { id: ctx.materialType.id } }],
        })[0];
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [ctx.folioInstance],
          location,
        });
      });

      createPolicyFn(ctx);

      CirculationRules.addRuleViaApi({ m: ctx.materialType.id }, { l: loanPolicyId }).then(
        (newRule) => {
          ctx.addedRule = newRule;
        },
      );
      UserEdit.addServicePointViaApi(ctx.servicePoint.id, ctx.userData.userId);
      cy.login(ctx.userData.username, ctx.userData.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
    });
  });
}

/**
 * Standard after-hook body. Cleans up all test data.
 * If ctx.fixedDueDateSchedule is set, the schedule is deleted after the loan policy.
 *
 * @param {object} ctx          - mutable context
 * @param {string} loanPolicyId - id of the loan policy to delete
 */
function teardownLoanTest(ctx, loanPolicyId) {
  cy.getAdminToken();
  CirculationRules.deleteRuleViaApi(ctx.addedRule);
  CheckInActions.checkinItemViaApi({
    itemBarcode: ctx.folioInstance.barcodes[0],
    servicePointId: ctx.servicePoint.id,
    checkInDate: new Date().toISOString(),
  });
  UserEdit.changeServicePointPreferenceViaApi(ctx.userData.userId, [ctx.servicePoint.id]);
  if (ctx.calendarId) deleteCalendar(ctx.calendarId);
  ServicePoints.deleteViaApi(ctx.servicePoint.id);
  if (ctx.fixedDueDateSchedule) {
    LoanPolicy.deleteApi(loanPolicyId).then(() => cy.deleteFixedDueDateSchedule(ctx.fixedDueDateSchedule.id));
  } else {
    LoanPolicy.deleteApi(loanPolicyId);
  }
  InventoryInstances.deleteInstanceViaApi({
    instance: ctx.folioInstance,
    servicePoint: ctx.servicePoint,
    shouldCheckIn: true,
  });
  Locations.deleteViaApi(ctx.defaultLocation);
  Users.deleteViaApi(ctx.userData.userId);
}

describe('Loan Policies', () => {
  const SPEC_FILE_PATH = 'cypress/e2e/loans/loan-policies.cy.js';

  before('Check run count — skip first run', () => {
    cy.task('incrementRunCount', { filePath: SPEC_FILE_PATH }).then((runCount) => {
      if (runCount < 2) {
        throw new Error(
          `First run detected (run #${runCount}). Tests intentionally skipped. Re-run the suite to execute.`,
        );
      }
    });
  });

  describe('SHORT term — Keep current due date', () => {
    const ctx = {};
    const LOAN_DURATION_H = 2;
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('short_term_2h'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.CURRENT_DUE_DATE_TIME,
        period: { duration: LOAN_DURATION_H, intervalId: 'Hours' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: buildShortTermTodayClosedCalendar,
        calendarName: getTestEntityValue('cal_c829891'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C829891 Due date remains unchanged from system calculated for SHORT term loan when loan policy has "Keep the current due date/time" option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'test2run', 'vega', 'C829891'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — policy "Keep current" means due date is NOT adjusted
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        // Date part = now + LOAN_DURATION_H; time not checked (kept as-is by the policy)
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({
            date: moment().add(LOAN_DURATION_H, 'hours').toDate(),
          }),
          moment.utc().add(LOAN_DURATION_H, 'hours').format('h:mm A'),
        );
      },
    );
  });
});
