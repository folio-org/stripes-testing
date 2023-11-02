import HTML from './baseHTML';

export default HTML.extend('data import upload file')
  .selector('section[id=pane-jobs-title]')
  .filters({
    isDeleteFilesButtonExists: (el) => [...el.querySelectorAll('button')]
      .map((button) => button.textContent)
      .includes('Delete files'),
  });
