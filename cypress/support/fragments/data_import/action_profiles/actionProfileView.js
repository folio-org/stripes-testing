import { HTML, including } from '@interactors/html';
import {
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  Link,
  KeyValue,
} from '../../../../../interactors';

const viewPane = Pane({ id: 'view-action-profile-pane' });
const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');

export default {
  edit: () => {
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
  },

  verifyLinkedFieldMappingProfile: (profileName) => {
    cy.expect(
      MultiColumnList({ id: 'associated-mappingProfiles-list' })
        .find(MultiColumnListCell({ content: profileName }))
        .exists(),
    );
  },

  verifyLinkedFieldMappingProfileAbsent: (profileName) => {
    cy.expect(viewPane.find(HTML(including(profileName))).absent());
  },

  openFieldMappingProfileView: () => {
    cy.do(
      viewPane
        .find(Link({ href: including('/settings/data-import/mapping-profiles/view') }))
        .perform((elem) => {
          const linkForVisit = elem.getAttribute('href');
          cy.visit(linkForVisit);
        }),
    );
  },
  verifyActionProfileOpened: () => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },
  verifyAction: () => cy.expect(KeyValue('Action').has({ value: 'Update' })),
  closeViewModeForMatchProfile: () => cy.do(viewPane.find(Button({ icon: 'times' })).click()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
};
