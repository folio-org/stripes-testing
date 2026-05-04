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
const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm';
const DEFAULT_START_TIME = '00:00';
const DEFAULT_END_TIME = '23:00';
const END_OF_DAY_TIME = '11:59 PM';
/** Opening time for the next day used in all "move to beginning" short-term tests */
const NEXT_DAY_OPEN_TIME = '09:00';
const COMMON_PERMISSIONS = [
  Permissions.checkoutAll.gui,
  Permissions.uiUsersView.gui,
  Permissions.uiUsersViewLoans.gui,
];

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Compute the expected AM/PM time string for "move to beginning of next open SP hours" tests.
 * @param {number} offsetMinutes - opening time offset from the loan policy
 * @returns {string} e.g. "9:01 AM"
 */
function getExpectedBeginningTimeAmPm(offsetMinutes) {
  return moment(NEXT_DAY_OPEN_TIME, TIME_FORMAT).add(offsetMinutes, 'minutes').format('h:mm A');
}

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

/**
 * SHORT term — TODAY open 00:00 → now+1h; TOMORROW opens at NEXT_DAY_OPEN_TIME.
 * Due date (now+2h) exceeds today's closing → policy moves it to tomorrow opening + offset.
 * Exposes _tomorrowDate for date assertion.
 */
function buildShortTermTodayClosedTomorrowOpenCalendar({ servicePointId, calendarName }) {
  const todayDayOfWeek = moment.utc().format('dddd').toUpperCase();
  const tomorrowDayOfWeek = moment.utc().add(1, 'day').format('dddd').toUpperCase();
  const closingTime = moment.utc().add(1, 'hour').startOf('hour').format(TIME_FORMAT);
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
      {
        startDay: tomorrowDayOfWeek,
        startTime: NEXT_DAY_OPEN_TIME,
        endDay: tomorrowDayOfWeek,
        endTime: DEFAULT_END_TIME,
      },
    ],
    exceptions: [],
    _tomorrowDate: moment.utc().add(1, 'day').toDate(),
  };
}

/**
 * LONG term — SP open every day EXCEPT the due-date day.
 * @param {string}  servicePointId  - id of the service point to assign the calendar to
 * @param {string}  calendarName    - unique calendar name
 * @param {number}  loanPeriodDays  - used to determine which day of week must be closed
 * @param {boolean} ensureTodayOpen - always keep today in open days (needed for "Keep current" test)
 */
function buildLongTermClosedOnDueDateCalendar({
  servicePointId,
  calendarName,
  loanPeriodDays,
  ensureTodayOpen = true,
}) {
  const todayDayOfWeek = moment.utc().format('dddd').toUpperCase();
  const dueDateDayOfWeek = moment.utc().add(loanPeriodDays, 'days').format('dddd').toUpperCase();
  let openDays = DAYS_OF_WEEK.filter((day) => day !== dueDateDayOfWeek);
  if (ensureTodayOpen && !openDays.includes(todayDayOfWeek)) {
    openDays = [...openDays, todayDayOfWeek];
  }
  return {
    name: calendarName,
    assignments: [servicePointId],
    startDate: moment.utc().format(DATE_FORMAT),
    endDate: moment.utc().add(14, 'days').format(DATE_FORMAT),
    normalHours: openDays.map((day) => ({
      startDay: day,
      startTime: DEFAULT_START_TIME,
      endDay: day,
      endTime: DEFAULT_END_TIME,
    })),
    exceptions: [],
  };
}

/**
 * LONG term — SP open Monday–Friday 08:00–17:00 only (closed Sat–Sun).
 * Used for fixed-schedule tests where next Saturday is the due date cap.
 */
function buildWeekdaysOnlyCalendar({ servicePointId, calendarName }) {
  return {
    name: calendarName,
    assignments: [servicePointId],
    startDate: moment.utc().format(DATE_FORMAT),
    endDate: moment.utc().add(21, 'days').format(DATE_FORMAT),
    normalHours: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
      startDay: day,
      startTime: '08:00',
      endDay: day,
      endTime: '17:00',
    })),
    exceptions: [],
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
      { tags: ['extendedPath', 'vega', 'C829891'] },
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

  describe('SHORT term — Move to end of current SP hours', () => {
    const ctx = {};
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('move_to_end_sp_hours'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.END_OF_THE_CURRENT_SERVICE_POINT_HOURS,
        period: { duration: 2, intervalId: 'Hours' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: buildShortTermTodayClosedCalendar,
        calendarName: getTestEntityValue('cal_c829892'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C829892 Due date is changed to the endTime of the current service point for SHORT term loan when loan policy has "Move to the end..." option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'vega', 'C829892'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date is moved back to SP closing time (today, closingTimeAmPm)
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        // ctx.closingTimeAmPm is hoisted from the calendar builder (e.g. "3:00 PM")
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({ date: moment().toDate() }),
          ctx.closingTimeAmPm,
        );
      },
    );
  });

  describe('SHORT term — Move to beginning of next open SP hours', () => {
    const ctx = {};
    const OPENING_TIME_OFFSET_MINUTES = 1;
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('move_to_beginning_next_open'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.BEGINNING_OF_THE_NEXT_OPEN_SERVICE_POINT_HOURS,
        period: { duration: 2, intervalId: 'Hours' },
        profileId: LOAN_PROFILE.ROLLING,
        openingTimeOffset: { duration: OPENING_TIME_OFFSET_MINUTES, intervalId: 'Minutes' },
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: buildShortTermTodayClosedTomorrowOpenCalendar,
        calendarName: getTestEntityValue('cal_c831956'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C831956 Due date is changed to the earliest startTime of the current service point for SHORT term loan when loan policy has "Move to the beginning..." option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'vega', 'C831956'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date moved to tomorrow opening + offset (e.g. "9:01 AM")
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        // ctx.tomorrowDate is hoisted from the calendar builder
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({ date: ctx.tomorrowDate }),
          getExpectedBeginningTimeAmPm(OPENING_TIME_OFFSET_MINUTES),
        );
      },
    );
  });

  describe('LONG term — Keep current due date', () => {
    const ctx = {};
    const LOAN_PERIOD_DAYS = 2;
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('long_term_keep_due_date'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.CURRENT_DUE_DATE,
        period: { duration: LOAN_PERIOD_DAYS, intervalId: 'Days' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: ({ servicePointId, calendarName }) => buildLongTermClosedOnDueDateCalendar({
          servicePointId,
          calendarName,
          loanPeriodDays: LOAN_PERIOD_DAYS,
        }),
        calendarName: getTestEntityValue('cal_c844247'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C844247 Due date remains unchanged from system calculated for LONG term loan when loan policy has "Keep the current due date/time" option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'vega', 'C844247'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date stays at today + LOAN_PERIOD_DAYS, 11:59 PM
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({
            date: moment().add(LOAN_PERIOD_DAYS, 'days').toDate(),
          }),
          END_OF_DAY_TIME,
        );
      },
    );
  });

  describe('LONG term — Move to end of previous open day', () => {
    const ctx = {};
    const LOAN_PERIOD_DAYS = 3;
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('long_term_move_to_end_prev_open'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.END_OF_THE_PREVIOUS_OPEN_DAY,
        period: { duration: LOAN_PERIOD_DAYS, intervalId: 'Days' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: ({ servicePointId, calendarName }) => buildLongTermClosedOnDueDateCalendar({
          servicePointId,
          calendarName,
          loanPeriodDays: LOAN_PERIOD_DAYS,
          ensureTodayOpen: false,
        }),
        calendarName: getTestEntityValue('cal_c844248'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C844248 Due date is changed for the closest previous Open=true day for LONG term loan when loan policy has "Move to the end of the previous open day" option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'vega', 'C844248'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date moved BACK to day before the closed day, 11:59 PM
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({
            date: moment()
              .add(LOAN_PERIOD_DAYS - 1, 'days')
              .toDate(),
          }),
          END_OF_DAY_TIME,
        );
      },
    );
  });

  describe('LONG term — Move to end of next open day', () => {
    const ctx = {};
    const LOAN_PERIOD_DAYS = 3;
    const loanPolicy = {
      id: uuid(),
      name: getTestEntityValue('long_term_move_to_end_next_open'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.END_OF_THE_NEXT_OPEN_DAY,
        period: { duration: LOAN_PERIOD_DAYS, intervalId: 'Days' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicy.id,
        calendarBodyFn: ({ servicePointId, calendarName }) => buildLongTermClosedOnDueDateCalendar({
          servicePointId,
          calendarName,
          loanPeriodDays: LOAN_PERIOD_DAYS,
          ensureTodayOpen: false,
        }),
        calendarName: getTestEntityValue('cal_c844249'),
        createPolicyFn: () => LoanPolicy.createViaApi(loanPolicy),
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicy.id));

    it(
      'C844249 Due date is changed for the closest next Open=true day for LONG term loan when loan policy has "Move to the end of the next open day" option and service point is CLOSED (vega)',
      { tags: ['extendedPath', 'vega', 'C844249'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date moved FORWARD to day after the closed day, 11:59 PM
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicy.name);
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({
            date: moment()
              .add(LOAN_PERIOD_DAYS + 1, 'days')
              .toDate(),
          }),
          END_OF_DAY_TIME,
        );
      },
    );
  });

  describe('SHORT term — Fixed schedule + Move to beginning of next open SP hours', () => {
    const ctx = {};
    const OPENING_TIME_OFFSET_MINUTES = 1;
    const loanPolicyBody = {
      id: uuid(),
      name: getTestEntityValue('fixed_sched_move_to_beginning'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.BEGINNING_OF_THE_NEXT_OPEN_SERVICE_POINT_HOURS,
        fixedDueDateScheduleId: '',
        period: { duration: 2, intervalId: 'Hours' },
        profileId: LOAN_PROFILE.ROLLING,
        openingTimeOffset: { duration: OPENING_TIME_OFFSET_MINUTES, intervalId: 'Minutes' },
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicyBody.id,
        calendarBodyFn: buildShortTermTodayClosedTomorrowOpenCalendar,
        calendarName: getTestEntityValue('cal_c844877'),
        createPolicyFn: () => {
          // Fixed schedule covers a wide range — it doesn't cap the due date,
          // the calendar closure rule is what triggers the "move to beginning" behavior
          cy.createFixedDueDateSchedule({
            schedules: [
              {
                from: moment.utc().subtract(1, 'year').toISOString(),
                to: moment.utc().add(1, 'year').toISOString(),
                due: moment.utc().add(1, 'year').toISOString(),
              },
            ],
          }).then((schedule) => {
            ctx.fixedDueDateSchedule = schedule;
            loanPolicyBody.loansPolicy.fixedDueDateScheduleId = schedule.id;
            LoanPolicy.createViaApi(loanPolicyBody);
          });
        },
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicyBody.id));

    it(
      'C844877 Due date is changed for SHORT term loan when loan policy has Fixed due date schedule and "Move to the beginning..." option (service point is CLOSED) (vega)',
      { tags: ['extendedPath', 'vega', 'C844877'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date moved to tomorrow opening + 1 min offset (e.g. "9:01 AM")
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicyBody.name);
        // ctx.tomorrowDate is hoisted from the calendar builder
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({ date: ctx.tomorrowDate }),
          getExpectedBeginningTimeAmPm(OPENING_TIME_OFFSET_MINUTES),
        );
      },
    );
  });

  describe('LONG term — Fixed schedule + Move to end of previous open day', () => {
    const ctx = {};
    const loanPolicyBody = {
      id: uuid(),
      name: getTestEntityValue('long_term_fixed_sched_prev_open'),
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId:
          CLOSED_LIBRARY_DUE_DATE_MANAGEMENT.END_OF_THE_PREVIOUS_OPEN_DAY,
        fixedDueDateScheduleId: '',
        period: { duration: 2, intervalId: 'Weeks' },
        profileId: LOAN_PROFILE.ROLLING,
      },
      renewable: false,
      renewalsPolicy: { unlimited: false, numberAllowed: 1, renewFromId: 'SYSTEM_DATE' },
    };

    before('Create test data', () => {
      setupLoanTest(ctx, {
        loanPolicyId: loanPolicyBody.id,
        calendarBodyFn: buildWeekdaysOnlyCalendar,
        calendarName: getTestEntityValue('cal_c844878'),
        createPolicyFn: () => {
          // Fixed schedule caps the due date at next Saturday (closed day).
          // Policy "Move to end of previous open day" → due date lands on preceding Friday, 11:59 PM.
          const daysUntilSat = moment.utc().day() === 6 ? 7 : 6 - moment.utc().day();
          const nextSaturday = moment.utc().add(daysUntilSat, 'days').startOf('day');
          // Store next Friday for assertion in the it() block
          ctx.nextFriday = nextSaturday.clone().subtract(1, 'day').toDate();

          cy.createFixedDueDateSchedule({
            schedules: [
              {
                from: moment.utc().subtract(1, 'year').toISOString(),
                to: nextSaturday.toISOString(),
                due: nextSaturday.toISOString(),
              },
            ],
          }).then((schedule) => {
            ctx.fixedDueDateSchedule = schedule;
            loanPolicyBody.loansPolicy.fixedDueDateScheduleId = schedule.id;
            LoanPolicy.createViaApi(loanPolicyBody);
          });
        },
      });
    });

    after('Delete test data', () => teardownLoanTest(ctx, loanPolicyBody.id));

    it(
      'C844878 Due date is changed for LONG term loan when loan policy has Fixed due date schedule and "Move to the end of the previous open day" option (due date is outside the fixed schedule) (vega)',
      { tags: ['extendedPath', 'vega', 'C844878'] },
      () => {
        // Step 1: Scan patron and item barcodes in Check out app
        CheckOutActions.checkOutItemUser(ctx.userData.barcode, ctx.folioInstance.barcodes[0]);
        CheckOutActions.verifyItemCheckedOut(ctx.folioInstance.barcodes[0]);

        // Step 2: Open Loan details — due date = Friday before next Saturday (last open weekday), 11:59 PM
        CheckOutActions.openLoanDetails();
        LoansPage.waitLoading();
        CheckOutActions.checkLoanPolicyInLoanDetails(loanPolicyBody.name);
        // ctx.nextFriday set inside createPolicyFn during before hook
        CheckOutActions.checkLoanDetailsDueDate(
          DateTools.getFormattedDateWithSlashes({ date: ctx.nextFriday }),
          END_OF_DAY_TIME,
        );
      },
    );
  });
});
