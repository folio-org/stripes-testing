import {
  Button,
  MultiColumnListHeader,
  Pane,
  TextField,
  including,
  Accordion,
  HTML,
  Spinner,
  and,
  PaneHeader,
} from '../../../../../interactors';

const policiesPane = Pane('Authorization policies');
const policiesSearchInputField = policiesPane.find(TextField('Search'));
const policiesSearchButton = policiesPane.find(Button({ dataTestID: 'search-button' }));
const generalInformationAccordion = Accordion('General Information');
const recordLastUpdatedHeader = generalInformationAccordion.find(
  Button(including('Record last updated:')),
);

export default {
  waitContentLoading: () => {
    cy.expect(policiesPane.find(MultiColumnListHeader('Name')).exists());
  },

  clickOnPolicyName: (policyName) => {
    cy.do(policiesPane.find(HTML(policyName, { className: including('root') })).click());
    cy.wait(2000);
    cy.expect([Pane(policyName).exists(), Spinner().absent()]);
  },

  searchPolicy: (policyName) => {
    cy.expect(Spinner().absent());
    cy.do([policiesSearchInputField.fillIn(policyName), policiesSearchButton.click()]);
  },

  verifyPolicyViewPane: (policyName) => {
    cy.expect([Pane(policyName).exists(), Spinner().absent()]);
  },

  closePolicyDetailView: (policyName) => {
    cy.do(
      PaneHeader(policyName)
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(Pane(policyName).absent());
  },

  verifyGeneralInformationWhenCollapsed: (updatedDate) => {
    cy.expect(
      generalInformationAccordion.has({
        content: including(`Record last updated: ${updatedDate}`),
      }),
    );
  },

  verifyGeneralInformationWhenExpanded: (updatedDate, updatedUser, createdDate, createdUser) => {
    cy.do(recordLastUpdatedHeader.click());
    cy.expect([
      generalInformationAccordion.has({
        content: and(
          including(`Record last updated: ${updatedDate}`),
          including(`Source: ${updatedUser}`),
          including(`Record created: ${createdDate}`),
          including(`Source: ${createdUser}`),
        ),
      }),
    ]);
  },
};
