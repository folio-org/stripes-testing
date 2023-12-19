import { matching } from '@interactors/html';
import HTML from './baseHTML';
import Button from './button';
import TextField from './text-field';
import Select from './select';

const IncrementHourButton = HTML.extend('increment hour button').selector('button[id$="-next-hour"]');
const DecrementHourButton = HTML.extend('decrement hour button').selector('button[id$="-prev-hour"]');
const IncrementMinuteButton = HTML.extend('increment minute button').selector('button[id$="-next-minute"]');
const DecrementMinuteButton = HTML.extend('decrement minute button').selector('button[id$="-prev-minute"]');


export default HTML.extend('time dropdown')
  .selector('[class^="timepickerContainer-"]')
  .actions({
    incrementHour: async (interactor) => {
      await interactor.find(IncrementHourButton()).click();
    },
    decrementHour: async (interactor) => {
      await interactor.find(DecrementHourButton()).click();
    },
    incrementMinute: async (interactor) => {
      await interactor.find(IncrementMinuteButton()).click();
    },
    decrementMinute: async (interactor) => {
      await interactor.find(DecrementMinuteButton()).click();
    },
    setTimeAndClose: async (interactor, time) => {
      // format of time => 15:00 for 3:00 PM (Military time), set hours, set minutes, set PM,
      //  00:00 => 12:00 AM
      // 12:00 (12 noon) => 12:00 PM
      // timepicker value must be cleared before calling this action

      const [hour, minute] = time.split(':');

      let hourFieldValue;
      const minuteFieldValue = parseInt(minute, 10);
      let meridian; // 0 for AM, 1 for PM

      if (hour === '00' || hour === '0') {
        hourFieldValue = 12;
        meridian = 'AM';
      } else {
        const intHour = parseInt(hour, 10);
        meridian = intHour >= 12 ? 'PM' : 'AM';
        hourFieldValue = intHour > 12 ? intHour - 12 : intHour;
      }


      const hourTextField = await interactor.find(TextField({ id: matching(/-hour-input$/) }));
      const minuteTextField = await interactor.find(TextField({ id: matching(/-minute-input$/) }));

      await hourTextField.fillIn(hourFieldValue.toString());
      hourTextField.blur();
      await minuteTextField.fillIn(minuteFieldValue.toString());
      minuteTextField.blur();

      await interactor.find(Select({ id: matching(/-period-toggle$/) })).choose(meridian);

      await interactor.find(Button('Set time')).click();
    }
  });
