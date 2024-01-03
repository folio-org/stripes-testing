/**
 * utility functions for ui-calendar automated UI testing
 */

import DateTools from './dateTools';

const { getLocalizedTime } = DateTools.uiCalendar;

export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};

export const WEEKDAY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

/** Determine if a day is between two weekdays, inclusive */
export function weekdayIsBetween(
  testWeekday,
  start,
  end
) {
  let startIndex = WEEKDAYS[start];
  let endIndex = WEEKDAYS[end];

  // handles wraparounds, eg FRI (5) -> MON (1) converts to FRI (5) -> MON (8)
  // ensures startIndex <= endIndex
  if (startIndex > endIndex) {
    endIndex += 7;
  }
  // potentially shifts the bounds by a week to handle examples like above, if SUN (0) is queried
  if (startIndex > testWeekday.getDay()) {
    startIndex -= 7;
    endIndex -= 7;
  }

  return startIndex <= testWeekday.getDay() && testWeekday.getDay() <= endIndex;
}


/**
 * Determine how close a weekday is relative to a given reference date.
 * For weekdays more than a day away, the weekday will be returned in the payload
 * for additional formatting.  It is not included for sameDay/nextDay
 */
export function getRelativeWeekdayStatus(
  weekday,
  time,
  referenceDate
) {
  if (referenceDate.getDay() === WEEKDAYS[weekday]) {
    return {
      proximity: 'sameDay',
      weekday: undefined,
      date: undefined,
      time: getLocalizedTime(time)
    };
  }
  if ((referenceDate.getDay() + 1) % 7 === WEEKDAYS[weekday]) {
    return {
      proximity: 'nextDay',
      weekday: undefined,
      date: undefined,
      time: getLocalizedTime(time)
    };
  }
  return {
    proximity: 'otherWeekday',
    weekday,
    date: undefined,
    time: getLocalizedTime(time)
  };
}

