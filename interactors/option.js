import HTML from './baseHTML';

const label = (el) => {
  const labelText = el.getAttribute('label');
  return labelText;
};

const text = (el) => el.textContent;

export default HTML.extend('option')
  .selector('option')
  .filters({
    id: (el) => el.getAttribute('id'),
    value: (el) => el.getAttribute('value'),
    index: (el) => [...el.parentElement.children].indexOf(el),
  });

export const OptionGroup = HTML.extend('option group').selector('optgroup').locator(label).filters({
  text,
});
