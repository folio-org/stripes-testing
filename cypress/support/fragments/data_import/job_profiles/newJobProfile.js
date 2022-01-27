import { TextField, Select, Button, Accordion, HTML, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import ModalSelectActionProfile from './modalSelectActionProfile';

const acceptedDataType = 'MARC';

const defaultJobProfile = {
  profileName:  `autotestJobProfile${getRandomPostfix()}`,
  acceptedDataType,
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

  linkActionProfile(actionProfile) {
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(actionProfile);
    ModalSelectActionProfile.selectActionProfile(actionProfile);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfile))).exists());
  },

  linkMatchAndActionProfiles(matchProfileName, actionProfileName) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Match').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(0).click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },


  // variable 
  linkMatchAndActionProfilesForInstance(actionProfileName, matchProfileName, buttonIndex = 0) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Match').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(buttonIndex).click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForHoldings(actionProfileName, matchProfileName) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Match').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(2).click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  linkMatchAndActionProfilesForItem(actionProfileName, matchProfileName) {
    // link match profile to job profile
    cy.get('[id="type-selector-dropdown-linker-root"]').click();
    cy.do([
      Button('Match').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(matchProfileName, 'match');
    ModalSelectActionProfile.selectActionProfile(matchProfileName, 'match');
    cy.expect(Accordion('Overview').find(HTML(including(matchProfileName))).exists());
    // link action profile to match profile
    cy.get('[id*="type-selector-dropdown-ROOT"]').eq(4).click();
    cy.do([
      Button('Action').click(),
    ]);
    ModalSelectActionProfile.searchActionProfileByName(actionProfileName);
    ModalSelectActionProfile.selectActionProfile(actionProfileName);
    cy.expect(Accordion('Overview').find(HTML(including(actionProfileName))).exists());
  },

  clickSaveAndCloseButton: () => {
    cy.do(Button('Save as profile & Close').click());
    cy.expect(Button('Save as profile & Close').absent());
  },
};
