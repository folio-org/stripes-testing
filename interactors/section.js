import HTML from './baseHTML';

export default HTML.extend('section')
  .selector('section')
  .filters({
    id: (el) => el.getAttribute('id'),
    title: (el) => el.querySelector('[class^=paneTitleLabel-]').textContent,
    label: (el) => el.querySelector('[class^=labelArea-]').textContent,
    expanded: (el) => el.querySelector('[class^=content-wrap]').className.includes('expanded'),
    mark: (el) => el.querySelector('mark').textContent,
    error: (el) => el.querySelector('[class^=feedbackError]').textContent,
    menuSectionLabel: (el) => el.querySelector('[data-test-menu-section-label="true"]').textContent,
  })
  .actions({
    focus: ({ perform }) => perform((el) => el.querySelector('section').focus()),
    toggle: ({ perform }) => perform((el) => el.querySelector('[class^=defaultCollapseButton-]').click()),
  });
