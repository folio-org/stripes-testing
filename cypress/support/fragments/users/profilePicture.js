import { including } from '@interactors/html';
import {
  Button,
  not,
  ProfilePictureCard
} from '../../../../interactors';

const updateDropDownCss = 'div[id="updateProfilePictureDropdown"] > button';
const externalPictureUrl = 'https://png.pngtree.com/png-vector/20191101/ourmid/pngtree-cartoon-color-simple-male-avatar-png-image_1934459.jpg';
const localFileButton =   Button({ dataTestID: 'localFile' });
const externalUrlButton = Button({ dataTestID: 'externalURL' });
const deletePictureButton = Button({ dataTestID: 'delete' });

export default {

  verifyProfileCardIsPresent() {
    cy.expect(ProfilePictureCard({ testId: 'profile-picture' }).exists());
  },

  expandUpdateDropDown() {
    cy.do(cy.get(updateDropDownCss).click({ force: true }));
  },

  verifyLocalUploadbuttonIsPresent() {
    cy.expect(localFileButton.exists());
  },

  setPictureFromExternalUrl() {
    cy.do(externalUrlButton.click({ force: true }));
    cy.do(
      cy.get('#external-image-url').clear(), 
      cy.get('#external-image-url').type(externalPictureUrl), 
      cy.get('#save-external-link-btn').click()
    );
    this.saveAndClose();
  },

  saveAndClose() {
    cy.get('#clickable-save').click({ force: true })
  },

  deleteProfilePicture() {
    cy.do(deletePictureButton.click({ force: true }));
    cy.get('div[role="document"] span').contains('Yes').click();
    this.saveAndClose();
  },

  verifyPictureIsSet() {
    cy.expect(ProfilePictureCard({ testId: profileCardCss }).has({ src: including(externalPictureUrl) }));
  },

  verifyPictureIsRemoved() {
    cy.expect(ProfilePictureCard({ testId: profileCardCss }).has({ src: not(including(externalPictureUrl)) }));
  }
};