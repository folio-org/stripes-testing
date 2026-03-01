/**
 * Enables profile pictures functionality if it's currently disabled.
 */
export function enableProfilePictures() {
  cy.getProfilePictureSetting().then((respBody) => {
    const profilePictureConfig = respBody.settings[0];

    if (profilePictureConfig) {
      if (!profilePictureConfig.value.enabled) {
        profilePictureConfig.value.enabled = true;
        cy.updateProfilePictureSetting(profilePictureConfig.id, profilePictureConfig);
      }
    } else {
      cy.createProfilePictureSetting();
    }
  });
}
