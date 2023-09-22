import HTML from './baseHTML';

export default HTML.extend('TableRow')
  .selector('table tr')
  .filters({
    index: (el) => [...el.parentElement.children].indexOf(el),
    innerText: (el) => el.innerText.replaceAll('\t', '  ').trim(),
  });
