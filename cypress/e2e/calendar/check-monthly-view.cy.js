import { Pane, CalendarCell, Headline, Button, including, Link, not } from '../../../interactors';

import calendarFixtures from '../../fixtures/calendar_e2e_fixtures';

const testServicePoint = calendarFixtures.servicePoint;
const testCalendar = calendarFixtures.calendar;
const monthlyCalendarViewExpectedUIValues = calendarFixtures.expectedUIValues.monthlyCalendarView;

describe('Checking the view of calendar on "Monthly calendar view" tab', () => {
  let testCalendarResponse;

  before(() => {
    // login and open calendar settings
    cy.loginAsAdmin();

    // reset db state
    cy.deleteServicePoint(testServicePoint.id, false);

    // create test service point and calendar
    cy.createServicePoint(testServicePoint, (response) => {
      console.log(response.body);
      testCalendar.assignments = [response.body.id];

      cy.createCalendar(testCalendar, (calResponse) => {
        testCalendarResponse = calResponse.body;
      });
    });
  });

  beforeEach(() => {
    cy.openCalendarSettings();
    cy.do([
      Pane('Calendar').find(Link('Monthly calendar view')).click(),
      Pane('Monthly calendar view').find(Link(testServicePoint.name)).click()
    ]);
  });

  after(() => {
    // delete test calendar
    cy.deleteCalendar(testCalendarResponse.id);
  });


  it('tests if the "previous" and "next" buttons of the calendar works as expected', () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    cy.do([
      Pane(testServicePoint.name).find(Headline(including(months[currentDate.getMonth()]))).exists(),
      Pane(testServicePoint.name).find(Button({ ariaLabel: 'arrow-left' })).click(),
      Pane(testServicePoint.name).find(Headline(including(months[(currentDate.getMonth() - 1) % 12]))).exists(),
      Pane(testServicePoint.name).find(Button({ ariaLabel: 'arrow-right' })).click(),
      Pane(testServicePoint.name).find(Headline(including(months[(currentDate.getMonth())]))).exists(),
      Pane(testServicePoint.name).find(Button({ ariaLabel: 'arrow-right' })).click(),
      Pane(testServicePoint.name).find(Headline(including(months[(currentDate.getMonth() + 1) % 12]))).exists(),
      Pane(testServicePoint.name).find(Button({ ariaLabel: 'arrow-left' })).click(),
    ]);
  });

  it('checks that the contents of the calendar cells are correct', () => {
    /**
     * Preconditions:
     *  testCalendar is only open for all days in the current month
     */
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];


    const [startYear, startMonth, startDay] = testCalendar.startDate.split('-');
    const startDateObj = new Date(parseInt(startYear, 10), parseInt(startMonth, 10) - 1, parseInt(startDay, 10));
    let dayOfWeekIndex = startDateObj.getUTCDay(); // to keep track of current day of the week
    let currDay = 1; // to keep track of dayLabel property of "CalendarCell"s

    let currDate = `${startYear}-${startMonth}-${('0' + startDay).slice(-2)}`; // to keep track of current date so exceptions can be verified
    const lastDay = parseInt(testCalendar.endDate.split('-')[2], 10);

    // check adjacent days cells - every adjacent day cell's content must be equal to "Closed"
    cy.do(
      CalendarCell({ inCurrentMonth: false, content: not('Closed') }).absent()
    );


    while (currDay <= lastDay) {
      // if the current date is an exception...
      if (currDate in monthlyCalendarViewExpectedUIValues.exceptions) {
        const content = monthlyCalendarViewExpectedUIValues.exceptions[currDate];
        cy.do(CalendarCell({ dayLabel: currDay.toString(), content }).exists());
      } else {
        cy.do(CalendarCell({ dayLabel: currDay.toString(), content: monthlyCalendarViewExpectedUIValues.days[days[dayOfWeekIndex]] }).exists());
      }

      // update necessary variables
      currDay += 1;
      dayOfWeekIndex = (dayOfWeekIndex + 1) % 7;
      currDate = `${startYear}-${startMonth}-${('0' + currDay.toString()).slice(-2)}`;
    }
  });
});
