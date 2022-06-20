import { Section, Button, HTML, including, TextField } from '../../../../interactors';

const defaultCreateJobProfile = 'Default - Create SRS MARC Authority';
const defaultUpdateJobProfile = 'Update authority by matching 010';
const rootSection = Section({ id: 'marc-view-pane' });

// related with cypress\fixtures\oneMarcAuthority.mrc
const defaultAuthority = { id:'176116217',
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  lastRowNumber: 18,
  // it should be presented in marc bib one time to correct work(applicable in update of record)
  existingTag: '130',
  headingReference: 'Congress and foreign policy series',
  name: 'oneMarcAuthority.mrc',
  tag008AuthorityBytesProperties : {
    geoSubd : { interactor:TextField('Geo Subd'), defaultValue:'n', newValue:'v' },
    roman :{ interactor:TextField('Roman'), defaultValue:'|', newValue:'v' },
    lang :{ interactor:TextField('Lang'), defaultValue:'\\', newValue:'v' },
    kindRec : { interactor:TextField('Kind rec'), defaultValue:'a', newValue:'v' },
    catRules: { interactor:TextField('CatRules'), defaultValue:'c', newValue:'v' },
    sHSys: { interactor:TextField('SH Sys'), defaultValue:'a', newValue:'v' },
    series : { interactor:TextField('Series'), defaultValue:'n', newValue:'v' },
    numbSeries :{ interactor:TextField('Numb Series'), defaultValue:'n', newValue:'v' },
    mainUse : { interactor:TextField('Main use'), defaultValue:'a', newValue:'v' },
    subjUse : { interactor:TextField('Subj use'), defaultValue:'a', newValue:'v' },
    seriesUse : { interactor:TextField('Series use'), defaultValue:'b', newValue:'v' },
    subdType : { interactor:TextField('Subd type'), defaultValue:'n', newValue:'v' },
    govtAg: { interactor:TextField('Govt Ag'), defaultValue:'|', newValue:'v' },
    refEval: { interactor:TextField('RefEval'), defaultValue:'a', newValue:'v' },
    recUpd: { interactor:TextField('RecUpd'), defaultValue:'a', newValue:'v' },
    persName: { interactor:TextField('Pers Name'), defaultValue:'a', newValue:'v' },
    levelEst: { interactor:TextField('Level Est'), defaultValue:'a', newValue:'v' },
    modRecEst: { interactor:TextField('Mod Rec Est'), defaultValue:'\\', newValue:'v' },
    source: { interactor:TextField('Source'), defaultValue:'\\', newValue:'v' },
    getAllProperties:() => {
      return Object.values(defaultAuthority.tag008AuthorityBytesProperties).filter(objectProperty => typeof objectProperty !== 'function');
    },
    convertToSource:(properties) => {
      const changedProperties = [...properties];
      changedProperties.splice(12, 0, '          ');
      changedProperties.splice(15, 0, ' ');
      changedProperties.splice(19, 0, '    ');
      return changedProperties;
    },
    getNewValueSourceLine: () => defaultAuthority.tag008AuthorityBytesProperties.convertToSource(
      defaultAuthority.tag008AuthorityBytesProperties.getAllProperties().map(property => property.newValue)
    ).join('')
  } };

export default {
  defaultAuthority,
  defaultCreateJobProfile,
  defaultUpdateJobProfile,
  waitLoading: () => cy.expect(rootSection.exists()),
  edit:() => {
    cy.do(rootSection.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
  },
  contains: (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists()),
  notContains: (expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).absent()),
  deleteViaAPI:(internalAuthorityId) => {
    cy.okapiRequest({
      method: 'DELETE',
      isDefaultSearchParamsRequired : false,
      path: `records-editor/records/${internalAuthorityId}`,
    });
  }

};
