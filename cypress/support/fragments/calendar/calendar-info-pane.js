import { including } from '@interactors/html';
import Headline from '../../../../interactors/headline';
import {
  MultiColumnListCell,
  Pane,
  Button,
  List,
  ListItem,
  KeyValue,
  Accordion
} from '../../../../interactors';


export const checkExpandButton = () => {
  cy.do([
    Button('Expand all').absent(),
    Button('Collapse all').exists(),


    Accordion('Service point assignments', { open: true }).exists(),
    Accordion('Hours of operation', { open: true }).exists(),
    Accordion('Exceptions — openings', { open: true }).exists(),
    Accordion('Exceptions — closures', { open: true }).exists(),
    Accordion('Record metadata', { open: true }).exists(),

    Button('Collapse all').click(),
    Button('Collapse all').absent(),
    Button('Expand all').exists(),

    Accordion('Service point assignments', { open: false }).exists(),
    Accordion('Hours of operation', { open: false }).exists(),
    Accordion('Exceptions — openings', { open: false }).exists(),
    Accordion('Exceptions — closures', { open: false }).exists(),
    Accordion('Record metadata', { open: false }).exists()
  ]);
};

export const checkMenuAction = (calendarName) => {
  cy.do([
    Pane(calendarName).find(Button({ className: including('actionMenuToggle') })).click(),
    Button('Edit').exists(),
    Button('Duplicate').exists(),
    Button('Delete').exists()
  ]);
};

export const checkCalendarFields = (calendar, servicePoint) => {
  const firstClosureException = calendar.exceptions.find(cal => cal.openings.length === 0);
  const firstOpeningException = calendar.exceptions.find(cal => cal.openings.length !== 0);
  cy.do([
    Headline(calendar.name).exists(),
    KeyValue('Start date').exists(),
    KeyValue('End date').exists(),
    Accordion('Service point assignments').exists(),
    Accordion('Service point assignments').find(List()).find(ListItem(including(servicePoint.name))).exists(),
    Accordion('Hours of operation').exists(),
    Accordion('Exceptions — openings').exists(),
    Accordion('Exceptions — openings').find(MultiColumnListCell(firstOpeningException.name)).exists(),
    Accordion('Exceptions — closures').exists(),
    Accordion('Exceptions — closures').find(MultiColumnListCell(firstClosureException.name)).exists(),
    Accordion('Record metadata').exists()
  ]);
};
