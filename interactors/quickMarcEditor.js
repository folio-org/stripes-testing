import HTML from './baseHTML';

export default HTML.extend('quickMarcEditor')
  .selector('section[id=quick-marc-editor-pane]')
  .filters({
    rowsCount: (el) => [...el.querySelectorAll('div>div>div>div')].length,
    presentedFiledsTags:
    // {apply:
      el => [...el.querySelectorAll('input[name*=".tag"]')].map(tag => tag.getAttribute('value')),
    // default: and(['LDR', '001', '005', '008', '999'].map(field => some(field))
    // }
    presentedRequiredRows:
      el => {
        const parsedRows = [];
        el.querySelectorAll('div>div>div>div').forEach(row => parsedRows.push({
          tag : row.querySelector('input[name*=".tag"]')?.getAttribute('value'),
          isDeleteButtonExist: Boolean(row.querySelector('button[icon=trash]'))
        }));

        return parsedRows;

        // const tags = [...el.querySelectorAll('input[name*=".tag"]').map(tag => tag.getAttribute('value'))];
        // const isDeleteButtonExistArray = [...Boolean(el.querySelectorAll('button[icon=trash]'))];
        // return tags.map((specialTag, i) => ({
        //   tag: specialTag,
        //   isDeletedButtonExist: isDeleteButtonExistArray[i]
        // }));
      }

  });
