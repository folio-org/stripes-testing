import { HTML, including } from '@interactors/html';
import {
  Button,
  Modal,
  TextField,
  MultiColumnListCell,
  MultiColumnListRow,
} from '../../../../../../interactors';

const ModalSelectProfile = Modal('Select Field Mapping Profiles');

export default {
  searchMappingProfileByName: (mappingProfileName) => {
    cy.do([
      ModalSelectProfile.find(TextField({ name: 'query' })).fillIn(mappingProfileName),
      ModalSelectProfile.find(Button('Search')).click(),
    ]);
    cy.expect(ModalSelectProfile.find(HTML(including('1 record found'))).exists());
    cy.expect(ModalSelectProfile.find(MultiColumnListRow({ index: 0 })).exists());
    cy.expect(
      ModalSelectProfile.find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell(mappingProfileName))
        .exists(),
    );
    cy.expect(ModalSelectProfile.find(MultiColumnListRow({ index: 1 })).absent());
  },

  selectMappingProfile: (specialMappingProfileName) => {
    cy.do(ModalSelectProfile.find(MultiColumnListCell(specialMappingProfileName)).click());
    cy.expect(ModalSelectProfile.absent());
  },
};
