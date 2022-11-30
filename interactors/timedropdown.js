import { TextField, matching } from '@interactors/html';
import HTML from './baseHTML';
import Button from './button';

const IncrementHourButton = HTML.extend('increment hour button').selector('button[id$="-next-hour"]');
const DecrementHourButton = HTML.extend('decrement hour button').selector('button[id$="-prev-hour"]');
const IncrementMinuteButton = HTML.extend('increment minute button').selector('button[id$="-next-minute"]');
const DecrementMinuteButton = HTML.extend('decrement minute button').selector('button[id$="-prev-minute"]');


export default HTML.extend('time dropdown')
  .selector('[class^="timepickerContainer-"]')
  .actions({
    incrementHour: async (interactor) => {
      await interactor.find(IncrementHourButton()).click();
    }, // button selector, [class$="-next-hour"]
    decrementHour: async (interactor) => {
      await interactor.find(DecrementHourButton()).click();
    }, // [class$="-prev-hour"]
    incrementMinute: async (interactor) => {
      await interactor.find(IncrementMinuteButton()).click();
    },
    decrementMinute: async (interactor) => {
      await interactor.find(DecrementMinuteButton()).click();
    },
    setTimeAndClose: async (interactor, time) => {
      // format of time => 15:00 for 3:00 PM, set hours, set minutes, set PM,
      //  00:00 => 12:00 AM
      // 12:00 (12 noon) => 12:00 PM

      const [hour, minute] = time.split(':');

      let hourFieldValue;
      const minuteFieldValue = parseInt(minute, 10);
      let meridian; // 0 for AM, 1 for PM

      if (hour === '00' || hour === '0') {
        hourFieldValue = 12;
        meridian = 0;
      } else {
        const intHour = parseInt(hour, 10);
        meridian = intHour >= 12 ? 1 : 0;
        hourFieldValue = intHour > 12 ? intHour - 12 : intHour;
      }


      const hourTextField = await interactor.find(TextField({ id: matching(/-hour-input$/) }));
      const minuteTextField = await interactor.find(TextField({ id: matching(/-minute-input$/) }));

      await hourTextField.fillIn(hourFieldValue.toString());
      hourTextField.blur();
      await minuteTextField.fillIn(minuteFieldValue.toString());
      minuteTextField.blur();

      const meridianText = meridian === 0 ? 'AM' : 'PM';
      const meridianTextInverse = meridian === 0 ? 'PM' : 'AM';
      try {
        await interactor.find(Button(meridianText)).exists();
      } catch (e) {
        console.log(e);
        if (e.name === 'NoSuchElementError') {
          await interactor.find(Button(meridianTextInverse)).click();
        }
      }

      await interactor.find(Button('Set time')).click();
    }
  });
