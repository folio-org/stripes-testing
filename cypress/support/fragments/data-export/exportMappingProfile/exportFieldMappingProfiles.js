import { including } from 'bigtest';
import {
  Button,
  Pane,
  NavListItem,
  TextField,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  Modal,
} from '../../../../../interactors';
import exportNewFieldMappingProfile from './exportNewFieldMappingProfile';
import InteractorsTools from '../../../utils/interactorsTools';

const saveAndCloseButton = Button('Save & close');
const fieldMappingProfilesPane = Pane('Field mapping profiles');
const newButton = Button('New');
const searchButton = Button('Search');
const deleteButton = Button('Delete');
const actionsButton = Button('Actions');

const openNewMappingProfileForm = () => {
  cy.do(newButton.click());
};

const saveMappingProfile = () => {
  cy.do(saveAndCloseButton.click());
  cy.expect(saveAndCloseButton.absent());
};

export default {
  saveMappingProfile,
  createMappingProfile: (mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfile(mappingProfile);
    saveMappingProfile();
  },

  deleteMappingProfile: (mappingProfileName) => {
    cy.do([
      MultiColumnListCell(mappingProfileName).click(),
      actionsButton.click(),
      deleteButton.click(),
      Modal().find(deleteButton).click(),
    ]);
    InteractorsTools.checkCalloutMessage(
      `Mapping profile ${mappingProfileName} has been successfully deleted`,
    );
    cy.expect(MultiColumnListCell(mappingProfileName).absent());
  },

  createMappingProfileForItemHrid: (mappingProfile) => {
    openNewMappingProfileForm();
    exportNewFieldMappingProfile.fillMappingProfileForItemHrid(mappingProfile);
    saveMappingProfile();
  },

  goToFieldMappingProfilesTab() {
    cy.do(NavListItem('Data export').click());
    cy.expect(Pane('Data export').exists());
    cy.do(NavListItem('Field mapping profiles').click());
    cy.expect(fieldMappingProfilesPane.exists());
  },

  getFieldMappingProfile: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'data-export/mapping-profiles',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.mappingProfiles[0];
      });
  },

  verifyFieldMappingProfilesPane() {
    cy.expect([
      fieldMappingProfilesPane.exists(),
      newButton.has({ disabled: false }),
      TextField('Search Field mapping profiles').exists(),
      searchButton.has({ disabled: true }),
    ]);
    cy.do(cy.get('[class^=mclEndOfListContainer--]').should('have.text', 'End of list'));
    this.verifyFieldMappingProfilesCount();
    this.verifyColumnTitles();
  },

  verifyFieldMappingProfilesCount() {
    cy.do(
      cy.get('#search-results-list').then((elem) => {
        cy.expect(
          cy
            .get('#paneHeaderpane-results-subtitle')
            .should('have.text', `${elem.attr('data-total-count')} field mapping profiles`),
        );
      }),
    );
  },

  verifyColumnTitles() {
    ['Name', 'FOLIO record type', 'Format', 'Updated', 'Updated by'].forEach((title) => {
      cy.expect(fieldMappingProfilesPane.find(MultiColumnListHeader(title)).exists());
    });
  },

  verifyDefaultProfiles() {
    cy.expect([
      MultiColumnListRow(including('Default authority mapping profileAuthority')).exists(),
      MultiColumnListRow(including('Default holdings mapping profileHoldings')).exists(),
      MultiColumnListRow(including('Default instance mapping profileInstance')).exists(),
    ]);
  },

  verifyProfileNameOnTheList(name) {
    cy.expect([MultiColumnListRow(including(name)).exists()]);
  },
};
