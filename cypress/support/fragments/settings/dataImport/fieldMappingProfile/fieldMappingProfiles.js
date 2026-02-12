import uuid from 'uuid';
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
} from '../../../../../../interactors';
import mappingDetails from './mappingDetails';
import ResultsPane from '../resultsPane';
import FieldMappingProfileEditForm from './fieldMappingProfileEditForm';
import FieldMappingProfileView from './fieldMappingProfileView';
import getRandomPostfix from '../../../../utils/stringTools';
import { getLongDelay } from '../../../../utils/cypressTools';
import NewFieldMappingProfile from './newFieldMappingProfile';
import Callout from '../../../../../../interactors/callout';
import ArrayUtils from '../../../../utils/arrays';

const actionsButton = Button('Actions');
const searchButton = Button('Search');
const resultsPane = Pane({ id: 'pane-results' });
const searchField = TextField({ id: 'input-search-mapping-profiles-field' });
const deleteButton = Button('Delete');
const editButton = Button('Edit');
const dublicateButton = Button('Duplicate');

const marcAuthorityUpdateMappingProfile = {
  profile: {
    name: `Update MARC authority records mapping profile${getRandomPostfix()}`,
    incomingRecordType: 'MARC_AUTHORITY',
    existingRecordType: 'MARC_AUTHORITY',
    description: '',
    mappingDetails: mappingDetails.MARC_AUTHORITY,
  },
  addedRelations: [],
  deletedRelations: [],
};
const openNewMappingProfileForm = () => {
  cy.wait(2000);
  cy.do(actionsButton.click());
  cy.wait(1000);
  cy.do(Button('New field mapping profile').click());
};
const mappingProfileForDuplicate = {
  gobi: 'Default - GOBI monograph invoice',
  harrassowitz: 'Default - Harrassowitz serials invoice',
  ebsco: 'Default - EBSCO serials invoice',
  erasmus: 'Default - Erasmus monograph invoice',
  hein: 'Default - Hein serials invoice',
};

const search = (nameForSearch) => {
  cy.wait(1000);
  cy.do([searchField.focus(), searchField.fillIn(nameForSearch)]);
  cy.wait(1000);
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
    cy.do(MultiColumnListCell({ columnIndex: 0, row: 0, content: defaultProfile }).click());
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
    FieldMappingProfileEditForm.markFieldForProtection(firstProtectedField);
    FieldMappingProfileEditForm.markFieldForProtection(secondProtectedField);
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
    FieldMappingProfileView.closeViewMode(mappingProfileName);
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
            cells.push(cellValue);
          });
      })
      .then(() => {
        const isSorted = ArrayUtils.checkIsSortedAlphabetically({ array: cells });
        cy.expect(isSorted).to.equal(true);
      });
  },
  ...ResultsPane,
  clickCreateNewFieldMappingProfile() {
    ResultsPane.expandActionsDropdown();
    cy.do(Button('New field mapping profile').click());
    FieldMappingProfileEditForm.waitLoading();
    FieldMappingProfileEditForm.verifyFormView();

    return FieldMappingProfileEditForm;
  },
  openFieldMappingProfileView({ name, type }) {
    ResultsPane.searchByName(name);
    FieldMappingProfileView.waitLoading();
    FieldMappingProfileView.verifyFormView({ type });

    return FieldMappingProfileView;
  },
  marcAuthorityUpdateMappingProfile,
  getDefaultMappingProfile({
    incomingRecordType = 'MARC_AUTHORITY',
    existingRecordType = 'MARC_AUTHORITY',
    mappingFields = [],
    id = uuid(),
    name,
  } = {}) {
    const mappingFieldsNames = mappingFields.map(({ name: fieldName }) => fieldName);
    const updatedMappingFields = mappingDetails[existingRecordType].mappingFields.reduce(
      (acc, it) => {
        if (mappingFieldsNames.includes(it.name)) {
          const field = mappingFields.find(({ name: fieldName }) => fieldName === it.name);
          return [...acc, { ...it, ...field }];
        }
        return [...acc, it];
      },
      [],
    );

    return {
      profile: {
        id,
        name:
          name ||
          `autotest_${existingRecordType.toLowerCase()}_mapping_profile_${getRandomPostfix()}`,
        incomingRecordType,
        existingRecordType,
        description: '',
        mappingDetails: {
          ...mappingDetails[existingRecordType],
          mappingFields: updatedMappingFields,
        },
      },
      addedRelations: [],
      deletedRelations: [],
    };
  },
  getMappingProfilesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'data-import-profiles/mappingProfiles',
        isDefaultSearchParamsRequired: false,
        searchParams,
      })
      .then(({ body }) => body);
  },
  createMappingProfileViaApi(mappingProfile = marcAuthorityUpdateMappingProfile) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'data-import-profiles/mappingProfiles',
      body: mappingProfile,
    });
  },
  unlinkMappingProfileFromActionProfileApi(id, linkedMappingProfile) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `data-import-profiles/mappingProfiles/${id}`,
      body: linkedMappingProfile,
    });
  },
  deleteMappingProfileViaApi(profileId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `data-import-profiles/mappingProfiles/${profileId}`,
      failOnStatusCode: false,
    });
  },
  deleteMappingProfileByNameViaApi(profileName) {
    this.getMappingProfilesViaApi({ query: `name="${profileName}"` }).then(
      ({ mappingProfiles }) => {
        mappingProfiles.forEach((mappingProfile) => {
          this.deleteMappingProfileViaApi(mappingProfile.id);
        });
      },
    );
  },
};
