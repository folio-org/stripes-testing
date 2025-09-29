import {
  Button,
  Pane,
  PaneHeader,
  HTML,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  Callout,
  including,
  or,
  matching,
} from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';

const profilesPane = Pane(matching(/bulk edit profiles$/));
const newButton = Button('New');
const searchField = TextField('Search bulk edit profiles');
const profilesList = HTML({ className: including('profilesList-') });

export default {
  verifyPaneElements() {
    cy.expect([
      profilesPane.exists(),
      profilesPane.find(PaneHeader({ subtitle: matching(/profiles? found/) })).exists(),
      searchField.exists(),
      profilesList.exists(),
      profilesList
        .find(HTML(or(including('End of list'), including('No profiles available.'))))
        .exists(),
    ]);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  verifySuccessToast(actionType = 'created') {
    cy.expect(
      Callout({ type: 'success' }).has({ textContent: `Profile successfully ${actionType}.` }),
    );
  },

  verifyProfileInTable(name, description, userObject, isActive = true) {
    const targetProfileRow = profilesList.find(
      MultiColumnListRow({ content: including(name), isContainer: false }),
    );

    cy.expect(
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Name' }))
        .has({ content: including(name) }),
    );
    cy.expect(
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Description' }))
        .has({ content: description }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated' })).has({
        content: DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        }),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated by' })).has({
        content: including(
          `${userObject.lastName}, ${userObject.firstName} ${userObject.personal.middleName}`,
        ),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).has({ content: 'Active' }),
    );

    if (!isActive) {
      cy.do(
        targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).perform((el) => {
          cy.get(el).find('svg').should('have.class', 'icon-lock');
        }),
      );
    } else {
      cy.do(
        targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).perform((el) => {
          cy.get(el).find('svg').should('not.exist');
        }),
      );
    }
  },

  clickProfileRow(profileName) {
    cy.do(
      profilesList
        .find(MultiColumnListRow({ content: including(profileName), isContainer: false }))
        .click(),
    );
  },

  verifyProfileNotInTable(profileName) {
    cy.expect(profilesList.find(MultiColumnListRow({ content: including(profileName) })).absent());
  },

  deleteBulkEditProfileByNameViaApi(name) {
    cy.getBulkEditProfile({ query: `name="${name}"` }).then((profile) => {
      if (profile[0]) {
        cy.deleteBulkEditProfile(profile[0].id, true);
      }
    });
  },
};
