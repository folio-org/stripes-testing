import { Button, Pane, PaneHeader } from '../../../../../../interactors';

const chooseLanguagePane = Pane({ index: 2 });

export default {
  waitLoading() {
    cy.expect(chooseLanguagePane.exists());
  },

  selectCountry(countryName) {
    cy.do(Button(countryName).click());
  },

  verifyTitleOfPaneHeader(titleValue) {
    cy.expect(chooseLanguagePane.find(PaneHeader()).has({ title: titleValue }));
    cy.wait(1000);
  },
};
