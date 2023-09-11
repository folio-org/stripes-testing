import { Link, Button } from '@interactors/html';
import HTML from './baseHTML';

export const EntryManager = HTML.extend('Entry Manager')
  .selector('[data-test-entry-manager]')
  .actions({
    navTo: ({ find }, linkText) => find(Link(linkText)).click(),
    createEntry: ({ find }) => find(Button({ id: 'clickable-create-entry' })).click(),
  });

export const EntryForm = HTML.extend('Entry Form')
  .selector('[data-test-entry-form]')
  .actions({
    save: ({ find }) => find(Button('Save')).click(),
  });

export const EntryDetails = HTML.extend('Entry Details').selector('[data-test-detail-section]');
