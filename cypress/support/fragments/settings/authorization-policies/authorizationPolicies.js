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
  MultiColumnList,
  MultiColumnListCell,
} from '../../../../../interactors';
import { AUTHORIZATION_POLICIES_COLUMNS } from '../../../constants';

const policiesPane = Pane('Authorization policies');
const policiesSearchInputField = policiesPane.find(TextField('Search'));
const policiesSearchButton = policiesPane.find(Button({ dataTestID: 'search-button' }));
const generalInformationAccordion = Accordion('General Information');
const recordLastUpdatedHeader = generalInformationAccordion.find(
  Button(including('Record last updated:')),
);
const policySearchInputField = policiesPane.find(TextField({ testid: 'search-field' }));
const policySearchButton = policiesPane.find(Button({ dataTestID: 'search-button' }));

export const SETTINGS_SUBSECTION_AUTH_POLICIES = 'Authorization policies';

export default {
  waitContentLoading: () => {
    Object.values(AUTHORIZATION_POLICIES_COLUMNS).forEach((columnName) => {
      cy.expect(policiesPane.find(MultiColumnListHeader(columnName)).exists());
    });
    cy.expect([policySearchInputField.exists(), policySearchButton.exists()]);
  },

  clickOnPolicyName: (policyName) => {
    cy.do(policiesPane.find(HTML(policyName, { className: including('root') })).click());
    cy.wait(2000);
    cy.expect([Pane(policyName).exists(), Spinner().absent()]);
  },

  searchPolicy: (policyName) => {
    cy.expect(Spinner().absent());
    cy.do([policiesSearchInputField.fillIn(policyName), policiesSearchButton.click()]);
    cy.wait(1000);
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

  verifyPoliciesCount: (count) => {
    if (count === 0) cy.expect(policiesPane.find(MultiColumnList()).absent());
    else cy.expect(policiesPane.find(MultiColumnList()).has({ rowCount: count }));
  },

  checkPolicyFound: (policyName, isFound = true) => {
    const targetRow = policiesPane.find(HTML(policyName, { className: including('root') }));
    if (isFound) cy.expect(targetRow.exists());
    else cy.expect(targetRow.absent());
  },

  verifyPolicyRow: (policyName, policyDescription, updated, updatedBy) => {
    cy.do(
      policiesPane.find(MultiColumnListCell(policyName)).perform((element) => {
        const rowNumber = +element.parentElement.getAttribute('data-row-inner');
        cy.expect([
          policiesPane.find(MultiColumnListCell(policyDescription, { row: rowNumber })).exists(),
          policiesPane.find(MultiColumnListCell(updated, { row: rowNumber })).exists(),
          policiesPane.find(MultiColumnListCell(including(updatedBy), { row: rowNumber })).exists(),
        ]);
      }),
    );
  },
};
