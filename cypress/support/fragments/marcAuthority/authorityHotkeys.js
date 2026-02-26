export default {
  create: '{alt}N',
  edit: '{ctrl}{alt}E',
  save: '{ctrl}S',
  goToSearchFilterPane: '{ctrl}{alt}H',
  openShortcutsModal: '{ctrl}{alt}K',
  moveToPreviousSubfield: '{ctrl}[',
  moveToNextSubfield: '{ctrl}]',
  close: '{esc}',
  copy: '{ctrl}C',
  cut: '{ctrl}X',
  paste: '{ctrl}V',
  find: '{ctrl}F',

  pressHotKey(hotKey) {
    cy.wait(6000);
    cy.get('body').type(hotKey);
  },
};

export const shortcutList = [
  ['Create a new record', 'Alt + N'],
  ['Edit a record', 'Ctrl + Alt + E'],
  ['Save a record', 'Ctrl + S'],
  ['Go to Search & Filter pane', 'Ctrl + Alt + H'],
  ['Open keyboard shortcuts modal', 'Ctrl + Alt + K'],
  ['quickMARC only: Move to the next subfield in a text box', 'Ctrl + ]'],
  ['quickMARC only: Move to the previous subfield in a text box', 'Ctrl + ['],
  ['Close a modal or pop-up', 'Esc'],
  ['Copy', 'Ctrl + C'],
  ['Cut', 'Ctrl + X'],
  ['Paste', 'Ctrl + V'],
  ['Find', 'Ctrl + F'],
];
