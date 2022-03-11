import { Section, Button, HTML, including } from '../../../../interactors';

const defaultJobProfile = 'Default - Create SRS MARC Authority';
const rootSection = Section({ id: 'marc-view-pane' });

// related with cypress\fixtures\oneMarcAuthority.mrc
const defaultAuthority = { id:'176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 18,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '130',
  headingReference: 'Congress and foreign policy series',
  name: 'oneMarcAuthority.mrc' };

export default {
  defaultAuthority,
  defaultJobProfile,
  waitLoading: () => cy.expect(rootSection.exists()),
  edit:() => cy.do(rootSection.find(Button('Edit')).click()),
  contains: (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists())
};
