import { Button, Pane, PaneHeader } from '../../../../../../interactors';

const chooseLanguagePane = Pane({ index: 2 });

export default {
  waitLoading() {
    cy.expect(chooseLanguagePane.exists());
  },

  selectCountry(countryName) {
    cy.do(Button(countryName).click());
    // await since without it language is sometimes switches back
    cy.wait(2000);
  },

  verifyTitleOfPaneHeader(titleValue) {
    cy.expect(chooseLanguagePane.find(PaneHeader()).has({ title: titleValue }));
    cy.wait(1000);
  },
};
