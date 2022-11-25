import { HTML } from '@interactors/html';
import {
  Accordion,
  including,
  MultiColumnListRow,
  Button,
  Pane,
  Checkbox,
  MultiColumnListCell,
  Modal,
  TextField,
  MultiColumnList,
  Link,
  Callout,
  KeyValue
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const fullScreenView = Pane({ id:'full-screen-view' });
const associatedList = MultiColumnList({ id:'associated-actionProfiles-list' });

const closeViewModeForMappingProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(Button({ icon: 'times' })).click());
};

const checkUpdatesSectionOfMappingProfile = () => {
  cy.expect(Accordion({ id:'view-field-mappings-for-marc-updates' }).find(HTML(including('-'))).exists());
};

const checkOverrideSectionOfMappingProfile = (field, status) => {
  cy.do(MultiColumnListCell({ content: field }).perform(
    element => {
      const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

      cy.expect(fullScreenView.find(Accordion({ id: 'override-protected-section' }))
        .find(MultiColumnListRow({ indexRow: rowNumber })).find(Checkbox())
        .has({ disabled: status }));
    }
  ));
};

export default {
  checkUpdatesSectionOfMappingProfile,
  checkOverrideSectionOfMappingProfile,
  closeViewModeForMappingProfile,

  checkCreatedMappingProfile:(profileName, firstField, secondField, firstFieldStatus = true, secondFieldStatus = true) => {
    checkUpdatesSectionOfMappingProfile();
    cy.do(Accordion({ id:'override-protected-section' }).clickHeader());
    checkOverrideSectionOfMappingProfile(firstField, firstFieldStatus);
    checkOverrideSectionOfMappingProfile(secondField, secondFieldStatus);
    closeViewModeForMappingProfile(profileName);
  },

  editMappingProfile:() => {
    cy.do([
      fullScreenView.find(actionsButton).click(),
      Button('Edit').click()
    ]);
  },

  deleteMappingProfile:(name) => {
    cy.do([
      fullScreenView.find(actionsButton).click(),
      deleteButton.click(),
      Modal(including(name)).find(deleteButton).click()
    ]);
  },

  checkErrorMessageIsPresented:(textFieldName) => {
    const fieldName = TextField(textFieldName);

    cy.do(fieldName.click());
    cy.expect(fieldName.has({ error: 'Please enter a value' }));
  },

  verifyLinkedActionProfile:(profileName) => {
    cy.expect(Accordion('Associated action profiles')
      .find(associatedList)
      .find(MultiColumnListCell({ content: profileName }))
      .exists());
  },

  openAssociatedActionProfile:() => {
    cy.do(associatedList.find(Link({ href: including('/settings/data-import/action-profiles/view') }))
      .perform(elem => {
        const linkForVisit = elem.getAttribute('href');
        cy.visit(linkForVisit);
      }));
  },

  checkCalloutMessage: (profileName) => {
    cy.expect(Callout({ textContent: including(`The field mapping profile "${profileName}" was successfully updated`) })
      .exists());
  },

  verifyInstanceStatusTerm:(status) => {
    cy.expect(KeyValue('Instance status term').has({ value: status }));
  }
};
