import HTML from './baseHTML';

function label(el) {
  const labelEl = el.querySelector('[class^="groupTitle--"] label');
  return labelEl ? labelEl.textContent : '';
}

export default HTML.extend('group').selector('[class^="groupContainer--"]').locator(label).filters({
  title: label,
});
