/**
 * utility functions for ui-calendar automated UI testing
 */

import DateTools from './dateTools';
import { WEEKDAYS, WEEKDAY_INDEX, getRelativeWeekdayStatus, weekdayIsBetween } from './uiCalendar_WeekdayUtils';

const {
  dateFromHHMM,
  dateFromYYYYMMDD,
  dateFromYYYYMMDDAndHHMM,
  dateToTimeOnly,
  getLocalizedDate, getLocalizedTime,
  getRelativeDateProximity,
  dateFromDateAndHHMM
} = DateTools.uiCalendar;

/** Get all openings and exceptions which apply to this date */
export function getDateMatches(
  testDate,
  calendar
) {
  const testDateDayStart = new Date(
    testDate.getFullYear(),
    testDate.getMonth(),
    testDate.getDate()
  );
  return {
    openings: calendar.normalHours.filter((opening) => {
      return weekdayIsBetween(testDate, opening.startDay, opening.endDay);
    }),
    exceptions: calendar.exceptions.filter((exception) => {
      return (
        dateFromYYYYMMDD(exception.startDate) <= testDateDayStart &&
        testDateDayStart <= dateFromYYYYMMDD(exception.endDate)
      );
    })
  };
}

export function isInSingleDayNormalOpening(
  weekday,
  testWeekday,
  testDateTime,
  startTimeRel,
  endTimeRel
) {
  const testTime = dateToTimeOnly(testDateTime);

  // really only spans one day
  if (startTimeRel <= endTimeRel) {
    return (
      testWeekday === weekday &&
      testTime >= startTimeRel &&
      testTime <= endTimeRel
    );
  }
  // wraps around the week
  return (
    weekday !== testWeekday ||
    testTime <= endTimeRel ||
    testTime >= startTimeRel
  );
}

export function isMiddleDayInRange(
  startWeekday,
  endWeekday,
  testWeekday
) {
  const endWeekdayAdjusted =
    startWeekday > endWeekday ? endWeekday + 7 : endWeekday;
  const currentWeekdayAdjusted =
    startWeekday > testWeekday ? testWeekday + 7 : testWeekday;

  // between both ends
  return (
    startWeekday < currentWeekdayAdjusted &&
    currentWeekdayAdjusted < endWeekdayAdjusted
  );
}


/** Get the next exceptional opening on the same date, if any */
export function getNextExceptionalOpening(
  testDateTime,
  exception
) {
  let min = null;
  let minDate = null;
  for (const opening of exception.openings) {
    if (
      testDateTime <=
      dateFromYYYYMMDDAndHHMM(opening.startDate, opening.startTime) &&
      (minDate === null ||
        minDate >=
        dateFromYYYYMMDDAndHHMM(opening.startDate, opening.startTime))
    ) {
      min = opening;
      minDate = dateFromYYYYMMDDAndHHMM(opening.startDate, opening.startTime);
    }
  }
  return min;
}


/** Get the current exceptional opening, if any */
function getCurrentExceptionalOpening(
  testDateTime,
  exception
) {
  for (const opening of exception.openings) {
    if (
      dateFromYYYYMMDDAndHHMM(opening.startDate, opening.startTime) <=
      testDateTime &&
      testDateTime <= dateFromYYYYMMDDAndHHMM(opening.endDate, opening.endTime)
    ) {
      return opening;
    }
  }
  return null;
}

export function getExceptionalStatus(
  testDateTime,
  exception
) {
  // fully closed exception
  if (exception.openings.length === 0) {
    return {
      open: false,
      exceptional: true,
      exceptionName: exception.name
    };
  }

  const currentOpening = getCurrentExceptionalOpening(testDateTime, exception);
  // not currently open
  if (currentOpening === null) {
    const nextOpening = getNextExceptionalOpening(testDateTime, exception);
    // no future openings in exception
    if (nextOpening === null) {
      return {
        open: false,
        exceptional: true,
        exceptionName: exception.name
      };
    } else {
      // future opening found
      return {
        open: false,
        exceptional: true,
        exceptionName: exception.name,
        nextEvent: {
          proximity: getRelativeDateProximity(
            dateFromYYYYMMDD(nextOpening.startDate),
            testDateTime
          ),
          date: getLocalizedDate(nextOpening.startDate),
          time: getLocalizedTime(nextOpening.startTime),
          weekday:
            WEEKDAY_INDEX[
              dateFromYYYYMMDDAndHHMM(
                nextOpening.startDate,
                nextOpening.startTime
              ).getDay()
            ]
        }
      };
    }
  } else {
    // currently open
    return {
      open: true,
      exceptional: true,
      exceptionName: exception.name,
      nextEvent: {
        proximity: getRelativeDateProximity(
          dateFromYYYYMMDD(currentOpening.endDate),
          testDateTime
        ),
        date: getLocalizedDate(currentOpening.endDate),
        time: getLocalizedTime(currentOpening.endTime),
        weekday:
          WEEKDAY_INDEX[dateFromYYYYMMDD(currentOpening.endDate).getDay()]
      }
    };
  }
}


/** Get the current normal opening, if any */
export function getCurrentNormalOpening(
  testDateTime,
  openings
) {
  const currentWeekday = testDateTime.getDay();
  const testTime = dateToTimeOnly(testDateTime);

  for (const opening of openings) {
    const startWeekday = WEEKDAYS[opening.startDay];
    const endWeekday = WEEKDAYS[opening.endDay];

    const startTimeRel = dateFromHHMM(opening.startTime);
    const endTimeRel = dateFromHHMM(opening.endTime);

    // single-day interval
    if (
      startWeekday === endWeekday &&
      isInSingleDayNormalOpening(
        startWeekday,
        currentWeekday,
        testTime,
        startTimeRel,
        endTimeRel
      )
    ) {
      return opening;
    }

    // between both ends
    if (isMiddleDayInRange(startWeekday, endWeekday, currentWeekday)) {
      return opening;
    }

    // first day of interval
    if (
      currentWeekday === startWeekday &&
      currentWeekday !== endWeekday &&
      testTime >= startTimeRel
    ) {
      return opening;
    }

    // last day of interval
    if (
      currentWeekday !== startWeekday &&
      currentWeekday === endWeekday &&
      testTime <= endTimeRel
    ) {
      return opening;
    }
  }
  return null;
}


/** Get the next normal opening within the same day */
export function getNextNormalOpening(
  testDateTime,
  openings
) {
  let min = null;
  let minDate = null;

  // no need to handle the potential for the next one being before the current day
  // therefore, we only check startDay = current day and minimize startDay within that subset
  for (const opening of openings) {
    const openingTime = dateFromDateAndHHMM(testDateTime, opening.startTime);
    if (
      WEEKDAYS[opening.startDay] === testDateTime.getDay() &&
      testDateTime < openingTime &&
      (minDate === null || minDate > openingTime)
    ) {
      min = opening;
      minDate = openingTime;
    }
  }

  return min;
}
/**
 * Determine if a calendar is open 24/7
 * This will not check for 24/7 calendars that have more than a single opening,
 * even if it would be 24/7.
 */
export function isOpen247(openings) {
  if (openings.length !== 1) {
    return false;
  }
  const opening = openings[0];
  // same day
  if (opening.startDay === opening.endDay) {
    // M 00:00 to M 23:59 should NOT wrap around in this case
    // cases like M 08:00 -> M 07:59 should wrap
    const shifted = dateFromHHMM(opening.endTime);
    shifted.setMinutes(shifted.getMinutes() + 1);
    const startTimeDate = dateFromHHMM(opening.startTime);
    return (
      shifted.getHours() === startTimeDate.getHours() &&
      shifted.getMinutes() === startTimeDate.getMinutes() &&
      opening.startTime.substring(0, 5) !== '00:00'
    );
  }
  // across day boundary
  return (
    (WEEKDAYS[opening.endDay] + 1) % 7 === WEEKDAYS[opening.startDay] &&
    opening.endTime.substring(0, 5) === '23:59' &&
    opening.startTime.substring(0, 5) === '00:00'
  );
}



export function getNormalOpeningStatus(
  testDateTime,
  openings
) {
  // no openings on that day
  if (openings.length === 0) {
    return {
      open: false,
      exceptional: false
    };
  }

  const currentOpening = getCurrentNormalOpening(testDateTime, openings);
  // not currently open
  if (currentOpening === null) {
    const nextOpening = getNextNormalOpening(testDateTime, openings);
    // no future openings that day
    if (nextOpening === null) {
      return {
        open: false,
        exceptional: false
      };
    } else {
      // future opening found
      return {
        open: false,
        exceptional: false,
        nextEvent: getRelativeWeekdayStatus(
          nextOpening.startDay,
          nextOpening.startTime,
          testDateTime
        )
      };
    }
  } else {
    // currently open
    return {
      open: true,
      exceptional: false,
      nextEvent: getRelativeWeekdayStatus(
        currentOpening.endDay,
        currentOpening.endTime,
        testDateTime
      )
    };
  }
}

// this function will not consider things more than one day away, unless currently in an opening
function getCurrentStatusNonFormatted(
  testDateTime,
  calendar
) {
  const { openings, exceptions } = getDateMatches(testDateTime, calendar);

  if (exceptions.length !== 0) {
    return getExceptionalStatus(testDateTime, exceptions[0]);
  }
  if (isOpen247(calendar.normalHours)) {
    return { open: true, exceptional: false };
  }
  return getNormalOpeningStatus(testDateTime, openings);
}

function formatMessage(translationKey, options) {
  switch (translationKey) {
    case 'ui-calendar.currentStatus.open.noNext':
      return 'Open';
    case 'ui-calendar.currentStatus.open.sameDay':
      return `Open until ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.nextDay':
      return `Open until tomorrow at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.nextWeek':
      return `Open until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.sameElse':
      return `Open until ${options.nextDate} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.otherWeekday':
      return `Open until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.exceptional.noNext':
      return `Open (${options.exceptionName})`;
    case 'ui-calendar.currentStatus.open.exceptional.sameDay':
      return `Open (${options.exceptionName}) until ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.exceptional.nextDay':
      return `Open (${options.exceptionName}) until tomorrow at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.exceptional.nextWeek':
      return `Open (${options.exceptionName}) until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.exceptional.sameElse':
      return `Open (${options.exceptionName}) until ${options.nextDate} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.open.exceptional.otherWeekday':
      return `Open (${options.exceptionName}) until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.noNext':
      return 'Closed';
    case 'ui-calendar.currentStatus.closed.sameDay':
      return `Closed until ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.nextDay':
      return `Closed until tomorrow at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.nextWeek':
      return `Closed until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.sameElse':
      return `Closed until ${options.nextDate} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.otherWeekday':
      return `Closed until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.exceptional.noNext':
      return `Closed (${options.exceptionName})`;
    case 'ui-calendar.currentStatus.closed.exceptional.sameDay':
      return `Closed (${options.exceptionName}) until ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.exceptional.nextDay':
      return `Closed (${options.exceptionName}) until tomorrow at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.exceptional.nextWeek':
      return `Closed (${options.exceptionName}) until ${options.nextWeekday} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.exceptional.sameElse':
      return `Closed (${options.exceptionName}) until ${options.nextDate} at ${options.nextTime}`;
    case 'ui-calendar.currentStatus.closed.exceptional.otherWeekday':
      return `Closed (${options.exceptionName}) until ${options.nextWeekday} at ${options.nextTime}`;
    default:
      return 'Closed';
  }
}

/**
 * Gets the current status, as a translated string.
 * Available formats:
 * ui-calendar.currentStatus.(open | closed)
 * [.exceptional]
 * .(noNext | sameDay | nextDay | nextWeek | sameElse | otherWeekday)
 *
 * Note: sameElse is for exception events more than a week out
 * Available values:
 * - exceptionName (when exceptional is true)
 * - nextWeekday (when otherWeekday)
 * - nextDate (for any exceptional)
 * - nextTime (any of the last option)
 */
// this function will not consider things more than one day away, unless currently in an opening
export default function getCurrentStatus(
  testDateTime,
  calendar
) {
  const localeWeekdays = [
    {
      weekday: 'SUNDAY',
      short: 'Sun',
      long: 'Sunday'
    },
    {
      weekday: 'MONDAY',
      short: 'Mon',
      long: 'Monday'
    },
    {
      weekday: 'TUESDAY',
      short: 'Tue',
      long: 'Tuesday'
    },
    {
      weekday: 'WEDNESDAY',
      short: 'Wed',
      long: 'Wednesday'
    },
    {
      weekday: 'THURSDAY',
      short: 'Thu',
      long: 'Thursday'
    },
    {
      weekday: 'FRIDAY',
      short: 'Fri',
      long: 'Friday'
    },
    {
      weekday: 'SATURDAY',
      short: 'Sat',
      long: 'Saturday'
    }
  ];
  const status = getCurrentStatusNonFormatted(testDateTime, calendar);

  let translationKey = 'ui-calendar.currentStatus';

  if (status.open) {
    translationKey += '.open';
  } else {
    translationKey += '.closed';
  }

  if (status.exceptional) {
    translationKey += '.exceptional';
  }

  if (status.nextEvent !== undefined) {
    translationKey += '.' + status.nextEvent.proximity;
  } else {
    translationKey += '.noNext';
  }

  const nextWeekday = status.nextEvent?.weekday;
  let nextWeekdayString = '';
  if (nextWeekday !== undefined) {
    localeWeekdays.forEach(({ weekday, long }) => {
      if (weekday === nextWeekday) {
        nextWeekdayString = long;
      }
    });
  }

  return formatMessage(translationKey, {
    exceptionName: status.exceptionName,
    nextWeekday: nextWeekdayString,
    nextDate: status.nextEvent?.date,
    nextTime: status.nextEvent?.time
  });
}




