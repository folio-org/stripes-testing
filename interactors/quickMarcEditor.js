import HTML from './baseHTML';

export default HTML.extend('quickMarcEditor')
  .selector('section[id=quick-marc-editor-pane]')
  .filters({
    rowsCount: (el) => [...el.querySelectorAll('div>div>div>div')].length,
    requiredRows: (el) => {
      const requiredFields = ['LDR', '001', '005', '008', '999'];

      return [...el.querySelectorAll('div[class*=quickMarcEditorRow]')]
        .filter(row => requiredFields.includes(row.querySelector('input[name*=".tag"]').getAttribute('value')));
    }
  });
