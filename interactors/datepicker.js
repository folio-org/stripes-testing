import { createInteractor, TextField, Select } from '@interactors/html';
import { isVisible } from 'element-is-visible';
import { format, parseISO } from 'date-fns';
import IconButton from './icon-button';
import { dispatchFocusout } from './util';
import HTML from './baseHTML';

export default HTML.extend('datepicker')
  .selector('[data-test-datepicker-container]')
  .locator((el) => el.querySelector('label').textContent)
  .filters({
    id: (el) => el.querySelector('input').id,
    inputValue: (el) => el.querySelector('div[class^=textField] input').value,
    inputDay: (el) => Date(el.querySelector('div[class^=textField] input').value).getDay(),
    placeholder: (el) => el.querySelector('div[class^=textField] input').placeholder,
    label: (el) => el.querySelector('label').textContent,
    warning: (el) => (!el.querySelector('[role=alert] div')
      ? false
      : !!el.querySelector('[role=alert] div').className.match(/feedbackWarning/)),
    error: (el) => (!el.querySelector('[role=alert] div')
      ? false
      : !!el.querySelector('[role=alert] div').className.match(/feedbackError/)),
    focused: (el) => el.ownerDocument.activeElement === el.querySelector('input'),
    today: (el) => el.querySelector('input').value === format(new Date(), el.querySelector('input').placeholder),
    empty: (el) => el.querySelector('input').value === '',
    visible: {
      apply: (element) => isVisible(element) || (element.labels && Array.from(element.labels).some(isVisible)),
      default: true,
    },
    disabled: {
      apply: (el) => el.querySelector('input').hasAttribute('disabled'),
      default: false,
    },
    readOnly: (el) => el.querySelector('input').hasAttribute('readonly'),
    required: (el) => el.querySelector('input').hasAttribute('required'),
  })
  .actions({
    openCalendar: (interactor) => interactor.find(IconButton({ icon: 'calendar' })).click(),
    clear: (interactor) => interactor.find(IconButton({ icon: 'times-circle-solid' })).click(),
    click: ({ perform }) => perform((el) => {
      el.click();
    }),
    fillIn: (interactor, value) => interactor.find(TextField()).fillIn(value),
    focus: (interactor) => interactor.find(TextField()).focus(),
    blur: (interactor) => interactor.find(TextField()).perform(dispatchFocusout),
  });

const CalendarDays = HTML.extend('calendar days')
  .selector('[class^=calendar-] td')
  .locator((el) => {
    if (el.textContent.length === 1) {
      return `0${el.textContent}`;
    } else {
      return el.textContent;
    }
  });

const ActiveCalendarDays = HTML.extend('active calendar days')
  .selector('[class^=calendar-] td div:not([class*=muted])')
  .locator((el) => {
    if (el.textContent.length === 1) {
      return `0${el.textContent}`;
    } else {
      return el.textContent;
    }
  });

const MonthField = Select.extend('month select').selector('[class^=monthField');

export const Calendar = createInteractor('calendar widget')
  .selector('[class^=calendar-]')
  .filters({
    portal: (el) => el.parentElement.parentElement.id === 'OverlayContainer',
    visible: {
      apply: (el) => isVisible(el) || (el.labels && Array.from(el.labels).some(isVisible)),
      default: true,
    },
    containsFocus: (el) => el.ownerDocument.activeElement === el,
    today: (el) => format(
      parseISO(el.querySelector('td[tabindex="0"]').getAttribute('data-day')),
      'yyyy-MM-dd',
    ) === format(new Date(), 'yyyy-MM-dd'),
    month: (el) => el.querySelector('select').selectedOptions[0].label || '',
    year: (el) => el.querySelector('input').value,
    day: (el) => (!el.querySelector('[class^=selected-]')
      ? ''
      : el.querySelector('[class^=selected-]').textContent),
    days: (el) => Array.from(el.querySelectorAll('td')).reduce((days, node) => {
      if (node.getAttribute('data-excluded') !== 'true') {
        if (node.querySelector('[class*=muted-]')) {
          return days.concat([`_${node.textContent}_`]);
        } else {
          return days.concat([node.textContent]);
        }
      } else {
        return days;
      }
    }, []),
    excludedDays: (el) => Array.from(el.querySelectorAll('td')).reduce((days, node) => {
      if (node.getAttribute('data-excluded') === 'true') {
        if (node.querySelector('[class*=muted-]')) {
          return days.concat([`_${node.textContent}_`]);
        } else {
          return days.concat([node.textContent]);
        }
      } else {
        return days;
      }
    }, []),
  })
  .actions({
    clickDay: (interactor, value) => interactor.find(CalendarDays(value)).click(),
    clickActiveDay: (interactor, value) => interactor.find(ActiveCalendarDays(value.length > 1 ? value : `0${value}`)).click(),
    clickMonth: (interactor) => interactor.find(MonthField()).click(),
    focusDay: (interactor, value) => interactor.find(CalendarDays(value)).focus(),
    setYear: (interactor, value) => interactor.find(TextField()).perform((el) => {
      const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      property.set.call(el, value);
      el.dispatchEvent(
        new InputEvent('input', {
          inputType: 'insertFromPaste',
          bubbles: true,
          cancelable: false,
        }),
      );
    }),
  });
