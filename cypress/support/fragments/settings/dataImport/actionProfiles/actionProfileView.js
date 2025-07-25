import { HTML, including } from '@interactors/html';
import {
  Button,
  Pane,
  MultiColumnList,
  MultiColumnListCell,
  Link,
  KeyValue,
  Callout,
} from '../../../../../../interactors';

const viewPane = Pane({ id: 'view-action-profile-pane' });
const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');
const closeButton = Button({ icon: 'times' });

export default {
  waitLoading: () => {
    cy.wait(2000);
  },
  edit: () => {
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
  },

  delete: () => {
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Delete').click());
  },

  duplicate: () => {
    cy.wait(2000);
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Duplicate').click());
  },

  close: () => cy.do(viewPane.find(closeButton).click()),

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
    cy.wait(1000);
    cy.do(
      viewPane
        .find(Link({ href: including('/settings/data-import/mapping-profiles/view') }))
        .perform((elem) => {
          if (elem.hasAttribute('target') && elem.getAttribute('target') === '_blank') {
            elem.removeAttribute('target');
          }
          elem.click();
        }),
    );
  },
  verifyActionProfileOpened: () => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },
  verifyActionProfileTitleName: (profileName) => {
    cy.expect(viewPane.exists());
    cy.get('#view-action-profile-pane-content h2').should('have.text', profileName);
  },
  verifyAction: () => cy.expect(KeyValue('Action').has({ value: 'Update' })),
  closeViewModeForMatchProfile: () => cy.do(viewPane.find(Button({ icon: 'times' })).click()),
  verifyActionMenuAbsent: () => cy.expect(resultsPane.find(actionsButton).absent()),
  checkCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
  },
};
