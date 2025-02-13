import { HTML, including } from '@interactors/html';
import {
  Button,
  Form,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneContent,
  TextField,
} from '../../../../../interactors';
import Callout from '../../../../../interactors/callout';
import ArrayUtils from '../../../utils/arrays';
import { getLongDelay } from '../../../utils/cypressTools';
import FieldMappingProfileEdit from './fieldMappingProfileEdit';
import FieldMappingProfileView from './fieldMappingProfileView';
import NewFieldMappingProfile from './newFieldMappingProfile';

const actionsButton = Button('Actions');
const searchButton = Button('Search');
const resultsPane = Pane({ id: 'pane-results' });
const searchField = TextField({ id: 'input-search-mapping-profiles-field' });
const deleteButton = Button('Delete');
const editButton = Button('Edit');
const dublicateButton = Button('Duplicate');

const openNewMappingProfileForm = () => {
  cy.do([actionsButton.click(), Button('New field mapping profile').click()]);
};
const mappingProfileForDuplicate = {
  gobi: 'GOBI monograph invoice',
  harrassowitz: 'Default - Harrassowitz serials invoice',
  ebsco: 'Default - EBSCO serials invoice',
  erasmus: 'Default - Erasmus monograph invoice',
  hein: 'Default - Hein serials invoice',
};

const search = (nameForSearch) => {
  cy.do([searchField.focus(), searchField.fillIn(nameForSearch)]);
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
  createInstanceMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillInstanceMappingProfile(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  createHoldingsMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillHoldingsMappingProfile(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  createItemMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    NewFieldMappingProfile.fillItemMappingProfile(mappingProfile);
    FieldMappingProfileView.closeViewMode(mappingProfile.name);
    cy.expect(actionsButton.exists());
  },
  verifyActionMenu: () => {
    cy.do([Pane({ id: 'full-screen-view' }).find(actionsButton).click()]);
    cy.expect([editButton.exists(), deleteButton.exists(), dublicateButton.exists()]);
  },
  createInvoiceMappingProfile: (mappingProfile, defaultProfile) => {
    search(defaultProfile);
    duplicate();
    cy.wait(2000);
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
    search(mappingProfileName);
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

  verifyProfilesIsSortedInAlphabeticalOrder: () => {
    const cells = [];

    cy.get('div[class^="mclRowContainer--"]')
      .find('[data-row-index]')
      .each(($row) => {
        cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
          .invoke('text')
          .then((cellValue) => {
            cy.wait(1000);
            cells.push(cellValue);
          });
      })
      .then(() => {
        const isSorted = ArrayUtils.checkIsSortedAlphabetically({ array: cells });
        cy.expect(isSorted).to.equal(true);
      });
  },
};
