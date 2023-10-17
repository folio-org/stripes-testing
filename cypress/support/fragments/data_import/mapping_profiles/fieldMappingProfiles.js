import { including, HTML } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  TextField,
  Pane,
  MultiColumnListRow,
  PaneContent,
  Form,
  MultiColumnList,
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import FieldMappingProfileEdit from './fieldMappingProfileEdit';
import NewFieldMappingProfile from './newFieldMappingProfile';
import FieldMappingProfileView from './fieldMappingProfileView';
import Callout from '../../../../../interactors/callout';

const actionsButton = Button('Actions');
const searchButton = Button('Search');
const resultsPane = Pane({ id: 'pane-results' });
const searchField = TextField({ id: 'input-search-mapping-profiles-field' });

const openNewMappingProfileForm = () => {
  cy.do([actionsButton.click(), Button('New field mapping profile').click()]);
};
const mappingProfileForDuplicate = {
  gobi: 'GOBI monograph invoice',
  harrassowitz: 'Default - Harrassowitz serials invoice',
  ebsco: 'Default - EBSCO serials invoice',
};

const search = (nameForSearch) => {
  cy.do(searchField.fillIn(nameForSearch));
  cy.expect(searchButton.has({ disabled: false }));
  cy.do(searchButton.click(), getLongDelay());
};

const duplicate = () => {
  cy.do([
    Pane({ id: 'full-screen-view' }).find(actionsButton).click(),
    Button('Duplicate').click(),
  ]);
};

export default {
  openNewMappingProfileForm,
  search,
  mappingProfileForDuplicate,
  clearSearchField: () => {
    cy.do(searchField.focus());
    cy.do(Button({ id: 'input-mapping-profiles-search-field-clear-button' }).click());
  },
  waitLoading: () => cy.expect(MultiColumnListRow({ index: 0 }).exists()),
  createMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfile(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  createInvoiceMappingProfile: (mappingProfile, defaultProfile) => {
    search(defaultProfile);
    duplicate();
    cy.wait(1000);
    NewFieldMappingProfile.fillInvoiceMappingProfile(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  createOrderMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillOrderMappingProfile(mappingProfile);
    NewFieldMappingProfile.save();
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
  },
  createMappingProfileForMatch: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForMatch(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  createMappingProfileForUpdatesMarc: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
    NewFieldMappingProfile.save();
  },
  createMappingProfileForUpdatesMarcAuthority: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarcAuthority(mappingProfile);
    NewFieldMappingProfile.save();
  },
  createMappingProfileForUpdatesAndOverrideMarc: (
    mappingProfile,
    firstProtectedField,
    secondProtectedField,
  ) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(mappingProfile);
    FieldMappingProfileEdit.markFieldForProtection(firstProtectedField);
    FieldMappingProfileEdit.markFieldForProtection(secondProtectedField);
    NewFieldMappingProfile.save();
  },
  createMappingProfileWithNotes: (mappingProfile, note) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
    NewFieldMappingProfile.addAdministrativeNote(note, 9);
    NewFieldMappingProfile.save();
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  selectMappingProfileFromList: (profileName) => cy.do(MultiColumnListCell(profileName).click()),
  checkMappingProfilePresented: (mappingProfileName) => {
    cy.do(searchField.fillIn(mappingProfileName));
    cy.do(searchButton.click());
    cy.expect(MultiColumnListCell(mappingProfileName).exists());
  },
  checkListOfExistingProfilesIsDisplayed: () => {
    cy.wait(2000);
    cy.expect(
      PaneContent({ id: 'pane-results-content' })
        .find(MultiColumnList({ id: 'mapping-profiles-list' }))
        .exists(),
    );
  },
  checkNewMappingProfileFormIsOpened: () => cy.expect(Form({ id: 'mapping-profiles-form' }).exists()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  verifyMappingProfileAbsent: () => cy.expect(resultsPane.find(HTML(including('The list contains no items'))).exists()),
  verifySearchFieldIsEmpty: () => cy.expect(searchField.has({ value: '' })),
  verifySearchResult: (profileName) => {
    cy.expect(resultsPane.find(MultiColumnListCell({ row: 0, content: profileName })).exists());
  },
  checkSuccessDelitionCallout: (profileName) => {
    cy.expect(
      Callout({
        textContent: including(
          `The field mapping profile "${profileName}" was successfully deleted`,
        ),
      }).exists(),
    );
  },
};
