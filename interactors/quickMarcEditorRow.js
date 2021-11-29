import HTML from './baseHTML';

export default HTML.extend('quickMarkEditorRow')
  .selector('div[class*=quickMarcEditorRow]')
  //.selector('div[id=quick-marc-editor-pane-content')
  .filters({
    tag: (el) => el.className.contains('quickMarcEditorRowTag'),
    rowContent: (el) => el.className.contains('quickMarcEditorRowContent'),
    addButton: (el) => el.icon === 'plus-sign',
    deleteButton: (el) => el.icon === 'trash',
      rowsCount: el => el.children.length
    //rowsCount: (el) => el.querySelectorAll('div[class*=quickMarcEditorRow]').length

  });
