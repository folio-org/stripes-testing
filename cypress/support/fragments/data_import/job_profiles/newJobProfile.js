import { TextField, Select, Button, Accordion, HTML, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import ModalSelectActionProfile from './modalSelectActionProfile';

const acceptedDataType = {
  dataType: 'MARC',
};

const defaultJobProfile = {
  profileName:  `autotestJobProfile${getRandomPostfix()}`,
  acceptedDataType: acceptedDataType.dataType,
};

export default {
  acceptedDataType,

  defaultJobProfile,

  fillJobProfile: (specialJobProfile = defaultJobProfile) => {
    cy.do([
      TextField({ name:'profile.name' }).fillIn(specialJobProfile.profileName),
      Select({ name:'profile.dataType' }).choose(specialJobProfile.acceptedDataType),
    ]);
  },

  selectActionProfile(specialActionProfile) {
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(specialActionProfile.name);
    ModalSelectActionProfile.selectActionProfile(specialActionProfile.name);
    cy.expect(Accordion('Overview').find(HTML(including(specialActionProfile.name))).exists());
  },

  clickSaveAndCloseButton: () => {
    cy.do(Button('Save as profile & Close').click());
  }
};
