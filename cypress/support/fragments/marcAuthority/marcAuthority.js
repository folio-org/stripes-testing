import { Section, Button } from '../../../../interactors';

const defaultMarcFile = { name: 'oneMarcAuthority.mrc',
  headingReference: 'Congress and foreign policy series' };
const defaultJobProfile = 'Default - Create SRS MARC Authority';
const rootSection = Section({ id: 'marc-view-pane' });

export default {
  defaultMarcFile,
  defaultJobProfile,
  waitLoading: () => cy.expect(rootSection.exists()),
  edit:() => cy.do(rootSection.find(Button('Edit')).click())
};
